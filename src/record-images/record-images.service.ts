import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordImage } from './entities/record-image.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { R2Service } from './services/r2.service';
import {
  UploadImageDto,
  ImageResponseDto,
  UpdateImageDto,
} from './dto/image.dto';

@Injectable()
export class RecordImagesService {
  private readonly logger = new Logger(RecordImagesService.name);

  constructor(
    @InjectRepository(RecordImage)
    private readonly recordImageRepository: Repository<RecordImage>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly r2Service: R2Service,
  ) {}

  /**
   * Subir imagen para un record
   */
  async uploadImage(
    recordId: number,
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    userId?: number,
  ): Promise<ImageResponseDto> {
    // Verificar que el record existe
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Record con ID ${recordId} no encontrado`);
    }

    // Verificar si ya existe una imagen para este record
    const existingImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    if (existingImage) {
      throw new ConflictException(
        `El record ${recordId} ya tiene una imagen. Elimine la imagen existente primero.`,
      );
    }

    try {
      // Subir archivo a R2
      const uploadResult = await this.r2Service.uploadFile(
        file,
        recordId,
        userId,
      );

      // Crear registro en BD
      const recordImage = this.recordImageRepository.create({
        record_id: recordId,
        filename: uploadResult.filename,
        original_name: file.originalname,
        file_size: uploadResult.size,
        mime_type: file.mimetype,
        r2_key: uploadResult.key,
        description: uploadImageDto.description,
        uploaded_by: userId,
      });

      const savedImage = await this.recordImageRepository.save(recordImage);

      this.logger.log(
        `Imagen subida para record ${recordId}: ${uploadResult.key}`,
      );

      return this.mapToResponseDto(savedImage, uploadResult.publicUrl);
    } catch (error) {
      this.logger.error(
        `Error al subir imagen para record ${recordId}:`,
        error,
      );
      throw new BadRequestException(`Error al subir imagen: ${error.message}`);
    }
  }

  /**
   * Obtener imagen de un record
   */
  async getRecordImage(recordId: number): Promise<ImageResponseDto | null> {
    const recordImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
      relations: ['uploader'],
    });

    if (!recordImage) {
      return null;
    }

    // Generar URL de acceso
    const imageUrl = await this.getImageUrl(recordImage);

    return this.mapToResponseDto(recordImage, imageUrl);
  }

  /**
   * Actualizar metadatos de imagen
   */
  async updateImageMetadata(
    recordId: number,
    updateImageDto: UpdateImageDto,
    userId?: number,
  ): Promise<ImageResponseDto> {
    const recordImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    if (!recordImage) {
      throw new NotFoundException(
        `No se encontró imagen para el record ${recordId}`,
      );
    }

    // Actualizar metadatos
    await this.recordImageRepository.update(recordImage.id, {
      description: updateImageDto.description,
    });

    const updatedImage = await this.recordImageRepository.findOne({
      where: { id: recordImage.id },
    });

    const imageUrl = await this.getImageUrl(updatedImage!);

    this.logger.log(`Metadatos de imagen actualizados para record ${recordId}`);

    return this.mapToResponseDto(updatedImage!, imageUrl);
  }

  /**
   * Eliminar imagen de un record
   */
  async deleteRecordImage(recordId: number, userId?: number): Promise<void> {
    const recordImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    if (!recordImage) {
      throw new NotFoundException(
        `No se encontró imagen para el record ${recordId}`,
      );
    }

    try {
      // Eliminar archivo de R2
      await this.r2Service.deleteFile(recordImage.r2_key);

      // Soft delete en BD
      await this.recordImageRepository.update(recordImage.id, {
        is_active: false,
      });

      this.logger.log(
        `Imagen eliminada para record ${recordId}: ${recordImage.r2_key}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al eliminar imagen para record ${recordId}:`,
        error,
      );
      throw new BadRequestException(
        `Error al eliminar imagen: ${error.message}`,
      );
    }
  }

  /**
   * Reemplazar imagen existente
   */
  async replaceRecordImage(
    recordId: number,
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    userId?: number,
  ): Promise<ImageResponseDto> {
    // Eliminar imagen existente si existe
    try {
      await this.deleteRecordImage(recordId, userId);
    } catch (error) {
      // Si no existe imagen, continuar con el upload
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    // Subir nueva imagen
    return this.uploadImage(recordId, file, uploadImageDto, userId);
  }

  /**
   * Obtener todas las imágenes (para administración)
   */
  async getAllImages(): Promise<ImageResponseDto[]> {
    const images = await this.recordImageRepository.find({
      where: { is_active: true },
      relations: ['record', 'uploader'],
      order: { upload_date: 'DESC' },
    });

    const result: ImageResponseDto[] = [];

    for (const image of images) {
      const imageUrl = await this.getImageUrl(image);
      result.push(this.mapToResponseDto(image, imageUrl));
    }

    return result;
  }

  /**
   * Limpiar imágenes huérfanas (sin record asociado)
   */
  async cleanOrphanImages(): Promise<{ deletedCount: number }> {
    // Encontrar imágenes sin record asociado
    const orphanImages = await this.recordImageRepository
      .createQueryBuilder('ri')
      .leftJoin('ri.record', 'record')
      .where('record.id IS NULL')
      .andWhere('ri.is_active = :active', { active: true })
      .getMany();

    let deletedCount = 0;

    for (const image of orphanImages) {
      try {
        await this.r2Service.deleteFile(image.r2_key);
        await this.recordImageRepository.update(image.id, { is_active: false });
        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Error al limpiar imagen huérfana ${image.r2_key}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Limpieza completada: ${deletedCount} imágenes huérfanas eliminadas`,
    );

    return { deletedCount };
  }

  /**
   * Obtener URL de acceso a la imagen
   */
  private async getImageUrl(recordImage: RecordImage): Promise<string> {
    // Intentar URL pública primero
    const publicUrl = this.r2Service.getPublicUrl(recordImage.r2_key);

    if (publicUrl) {
      return publicUrl;
    }

    // Generar URL firmada
    return await this.r2Service.getSignedDownloadUrl(recordImage.r2_key);
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(
    recordImage: RecordImage,
    imageUrl: string,
  ): ImageResponseDto {
    return {
      id: recordImage.id,
      record_id: recordImage.record_id,
      filename: recordImage.filename,
      original_name: recordImage.original_name,
      file_size: recordImage.file_size,
      mime_type: recordImage.mime_type,
      description: recordImage.description,
      upload_date: recordImage.upload_date,
      uploaded_by: recordImage.uploaded_by,
      image_url: imageUrl,
    };
  }

  /**
   * Verificar si un record tiene imagen
   */
  async hasImage(recordId: number): Promise<boolean> {
    const count = await this.recordImageRepository.count({
      where: { record_id: recordId, is_active: true },
    });

    return count > 0;
  }

  /**
   * Obtener estadísticas de imágenes
   */
  async getImageStatistics(): Promise<{
    total: number;
    totalSize: number;
    byMimeType: Array<{ mime_type: string; count: number }>;
  }> {
    const images = await this.recordImageRepository.find({
      where: { is_active: true },
    });

    const total = images.length;
    const totalSize = images.reduce((sum, img) => sum + img.file_size, 0);

    // Agrupar por tipo MIME
    const mimeTypeMap = new Map<string, number>();
    images.forEach((img) => {
      mimeTypeMap.set(img.mime_type, (mimeTypeMap.get(img.mime_type) || 0) + 1);
    });

    const byMimeType = Array.from(mimeTypeMap.entries()).map(
      ([mime_type, count]) => ({
        mime_type,
        count,
      }),
    );

    return {
      total,
      totalSize,
      byMimeType,
    };
  }
}
