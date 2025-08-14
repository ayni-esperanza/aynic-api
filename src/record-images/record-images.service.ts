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
  MovementTrackingService,
  TrackingContext,
} from '../record-movement-history/movement-tracking.service';
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
    private readonly movementTrackingService: MovementTrackingService,
  ) {}

  /**
   * Subir imagen para un record con compresión automática
   */
  async uploadImage(
    recordId: number,
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    userId?: number,
    trackingContext?: TrackingContext,
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
      // Subir archivo a R2 con compresión automática
      const uploadResult = await this.r2Service.uploadFile(
        file,
        recordId,
        userId,
      );

      // Crear registro en BD con información de compresión
      const recordImage = this.recordImageRepository.create({
        record_id: recordId,
        filename: uploadResult.filename,
        original_name: file.originalname,
        file_size: uploadResult.size,
        mime_type: `image/${uploadResult.filename.split('.').pop()}`, // Usar formato comprimido
        r2_key: uploadResult.key,
        description: uploadImageDto.description,
        uploaded_by: userId,
      });

      const savedImage = await this.recordImageRepository.save(recordImage);

      this.logger.log(
        `Imagen comprimida y subida para record ${recordId}: ${uploadResult.key} ` +
          `(${(uploadResult.originalSize / 1024).toFixed(1)}KB → ${(uploadResult.size / 1024).toFixed(1)}KB, ` +
          `${uploadResult.compressionRatio.toFixed(1)}% reducción)`,
      );

      // Registrar en historial de movimientos
      if (trackingContext) {
        const record = await this.recordRepository.findOne({
          where: { id: recordId },
        });

        await this.movementTrackingService.trackImageUpload(
          recordId,
          record?.codigo || `ID-${recordId}`,
          {
            filename: uploadResult.filename,
            size: uploadResult.size,
            originalName: file.originalname,
          },
          trackingContext,
        );
      }

      return this.mapToResponseDto(savedImage, uploadResult.publicUrl, {
        originalSize: uploadResult.originalSize,
        compressionRatio: uploadResult.compressionRatio,
        dimensions: uploadResult.dimensions,
        quality: uploadResult.quality,
      });
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

    // Obtener información de compresión si está disponible
    let compressionInfo:
      | {
          originalSize: number;
          compressionRatio: number;
          dimensions: { width: number; height: number };
          quality: number;
        }
      | undefined = undefined;

    try {
      const metadata = await this.r2Service.getFileMetadata(recordImage.r2_key);
      if (metadata.compression.originalSize > 0) {
        compressionInfo = {
          originalSize: metadata.compression.originalSize,
          compressionRatio: metadata.compression.compressionRatio,
          dimensions: {
            width: metadata.compression.width,
            height: metadata.compression.height,
          },
          quality: metadata.compression.quality,
        };
      }
    } catch (error) {
      this.logger.warn(
        `No se pudieron obtener metadatos de compresión para ${recordImage.r2_key}`,
      );
    }

    return this.mapToResponseDto(recordImage, imageUrl, compressionInfo);
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

    // Obtener información de compresión
    let compressionInfo:
      | {
          originalSize: number;
          compressionRatio: number;
          dimensions: { width: number; height: number };
          quality: number;
        }
      | undefined = undefined;

    try {
      const metadata = await this.r2Service.getFileMetadata(recordImage.r2_key);
      if (metadata.compression.originalSize > 0) {
        compressionInfo = {
          originalSize: metadata.compression.originalSize,
          compressionRatio: metadata.compression.compressionRatio,
          dimensions: {
            width: metadata.compression.width,
            height: metadata.compression.height,
          },
          quality: metadata.compression.quality,
        };
      }
    } catch (error) {
      // Continuar sin información de compresión
    }

    this.logger.log(`Metadatos de imagen actualizados para record ${recordId}`);

    return this.mapToResponseDto(updatedImage!, imageUrl, compressionInfo);
  }

  /**
   * Eliminar imagen de un record
   */
  async deleteRecordImage(
    recordId: number,
    userId?: number,
    trackingContext?: TrackingContext,
  ): Promise<void> {
    const recordImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    if (!recordImage) {
      throw new NotFoundException(
        `No se encontró imagen para el record ${recordId}`,
      );
    }

    // Registrar en historial antes de eliminar
    if (trackingContext) {
      const record = await this.recordRepository.findOne({
        where: { id: recordId },
      });

      await this.movementTrackingService.trackImageDeletion(
        recordId,
        record?.codigo || `ID-${recordId}`,
        {
          filename: recordImage.filename,
          size: recordImage.file_size,
        },
        trackingContext,
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
   * Reemplazar imagen existente con compresión
   */
  async replaceRecordImage(
    recordId: number,
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    userId?: number,
    trackingContext?: TrackingContext,
  ): Promise<ImageResponseDto> {
    // Obtener información de la imagen anterior
    const existingImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    const oldImageInfo = existingImage
      ? {
          filename: existingImage.filename,
          size: existingImage.file_size,
        }
      : null;

    // Eliminar imagen existente si existe
    try {
      await this.deleteRecordImage(recordId, userId);
    } catch (error) {
      // Si no existe imagen, continuar con el upload
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    // Subir nueva imagen con compresión
    const result = await this.uploadImage(
      recordId,
      file,
      uploadImageDto,
      userId,
    );

    // NUEVO: Registrar reemplazo en historial
    if (trackingContext && oldImageInfo) {
      const record = await this.recordRepository.findOne({
        where: { id: recordId },
      });

      await this.movementTrackingService.trackImageReplace(
        recordId,
        record?.codigo || `ID-${recordId}`,
        oldImageInfo,
        {
          filename: result.filename,
          size: result.file_size,
          originalName: file.originalname,
        },
        trackingContext,
      );
    }

    return result;
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

      // Obtener información de compresión si está disponible
      let compressionInfo:
        | {
            originalSize: number;
            compressionRatio: number;
            dimensions: { width: number; height: number };
            quality: number;
          }
        | undefined = undefined;

      try {
        const metadata = await this.r2Service.getFileMetadata(image.r2_key);
        if (metadata.compression.originalSize > 0) {
          compressionInfo = {
            originalSize: metadata.compression.originalSize,
            compressionRatio: metadata.compression.compressionRatio,
            dimensions: {
              width: metadata.compression.width,
              height: metadata.compression.height,
            },
            quality: metadata.compression.quality,
          };
        }
      } catch (error) {}

      result.push(this.mapToResponseDto(image, imageUrl, compressionInfo));
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
   * Mapear entidad a DTO de respuesta con información de compresión
   */
  private mapToResponseDto(
    recordImage: RecordImage,
    imageUrl: string,
    compressionInfo?: {
      originalSize: number;
      compressionRatio: number;
      dimensions: { width: number; height: number };
      quality: number;
    },
  ): ImageResponseDto {
    const response: ImageResponseDto = {
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

    // Agregar información de compresión si está disponible
    if (compressionInfo) {
      (response as any).compression_info = {
        original_size: compressionInfo.originalSize,
        compressed_size: recordImage.file_size,
        compression_ratio: compressionInfo.compressionRatio,
        dimensions: compressionInfo.dimensions,
        quality: compressionInfo.quality,
        savings_kb: Math.round(
          (compressionInfo.originalSize - recordImage.file_size) / 1024,
        ),
        savings_percentage: compressionInfo.compressionRatio.toFixed(1) + '%',
      };
    }

    return response;
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
   * Obtener estadísticas de imágenes con información de compresión
   */
  async getImageStatistics(): Promise<{
    total: number;
    totalSize: number;
    totalOriginalSize: number;
    totalSavings: number;
    averageCompressionRatio: number;
    byMimeType: Array<{ mime_type: string; count: number }>;
    storageEfficiency: {
      currentStorageUsed: number;
      originalStorageWouldBe: number;
      spaceSaved: number;
      efficiencyPercentage: number;
    };
  }> {
    const images = await this.recordImageRepository.find({
      where: { is_active: true },
    });

    const total = images.length;
    const totalSize = images.reduce((sum, img) => sum + img.file_size, 0);

    // Obtener información de compresión de R2 metadatos
    let totalOriginalSize = 0;
    let totalSavings = 0;
    let totalCompressionRatio = 0;
    let imagesWithCompressionInfo = 0;

    for (const image of images) {
      try {
        const metadata = await this.r2Service.getFileMetadata(image.r2_key);
        if (metadata.compression.originalSize > 0) {
          totalOriginalSize += metadata.compression.originalSize;
          totalSavings +=
            metadata.compression.originalSize -
            metadata.compression.compressedSize;
          totalCompressionRatio += metadata.compression.compressionRatio;
          imagesWithCompressionInfo++;
        } else {
          // Si no hay metadatos de compresión, usar el tamaño actual como original
          totalOriginalSize += image.file_size;
        }
      } catch (error) {
        // Si no hay metadatos de compresión, usar el tamaño actual
        totalOriginalSize += image.file_size;
      }
    }

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

    const averageCompressionRatio =
      imagesWithCompressionInfo > 0
        ? totalCompressionRatio / imagesWithCompressionInfo
        : 0;

    const storageEfficiency = {
      currentStorageUsed: totalSize,
      originalStorageWouldBe: totalOriginalSize,
      spaceSaved: totalSavings,
      efficiencyPercentage:
        totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0,
    };

    this.logger.log(
      `Estadísticas de compresión: ${total} imágenes, ` +
        `${(totalSavings / 1024 / 1024).toFixed(2)}MB ahorrados ` +
        `(${storageEfficiency.efficiencyPercentage.toFixed(1)}% eficiencia)`,
    );

    return {
      total,
      totalSize,
      totalOriginalSize,
      totalSavings,
      averageCompressionRatio,
      byMimeType,
      storageEfficiency,
    };
  }

  /**
   * Optimizar imagen existente (re-comprimir con nuevos parámetros)
   */
  async optimizeExistingImage(recordId: number): Promise<{
    before: { size: number; url: string };
    after: { size: number; url: string };
    savings: number;
  }> {
    const recordImage = await this.recordImageRepository.findOne({
      where: { record_id: recordId, is_active: true },
    });

    if (!recordImage) {
      throw new NotFoundException(
        `No se encontró imagen para el record ${recordId}`,
      );
    }

    const beforeSize = recordImage.file_size;
    const beforeUrl = await this.getImageUrl(recordImage);

    this.logger.log(`Optimización de imagen existente para record ${recordId}`);

    return {
      before: { size: beforeSize, url: beforeUrl },
      after: { size: beforeSize, url: beforeUrl }, // Mismo por ahora
      savings: 0,
    };
  }
}
