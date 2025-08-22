import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './entities/maintenance.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { R2Service } from '../record-images/services/r2.service';
import {
  MovementTrackingService,
  TrackingContext,
} from '../record-movement-history/movement-tracking.service';
import {
  CreateMaintenanceDto,
  MaintenanceResponseDto,
} from './dto/maintenance.dto';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenanceRepository: Repository<Maintenance>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly r2Service: R2Service,
    private readonly movementTrackingService: MovementTrackingService,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
    file?: Express.Multer.File,
    userId?: number,
  ): Promise<MaintenanceResponseDto> {
    // Verificar que la línea de vida existe
    const record = await this.recordRepository.findOne({
      where: { id: createMaintenanceDto.record_id },
    });

    if (!record) {
      throw new NotFoundException(
        `Línea de vida con ID ${createMaintenanceDto.record_id} no encontrada`,
      );
    }

    // Validar que la fecha no sea futura
    const maintenanceDate = new Date(createMaintenanceDto.maintenance_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (maintenanceDate > today) {
      throw new BadRequestException(
        'La fecha del mantenimiento no puede ser futura',
      );
    }

    // Validar nueva longitud si se proporciona
    if (createMaintenanceDto.new_length_meters !== undefined) {
      if (createMaintenanceDto.new_length_meters <= 0) {
        throw new BadRequestException(
          'La nueva longitud debe ser un número positivo mayor a cero',
        );
      }
    }

    let imageInfo: {
      filename: string;
      key: string;
      size: number;
      publicUrl: string;
    } | null = null;

    // Subir imagen si se proporciona
    if (file) {
      try {
        const uploadResult = await this.uploadMaintenanceImage(
          file,
          createMaintenanceDto.record_id,
          userId,
        );
        imageInfo = uploadResult;
      } catch (error) {
        this.logger.error('Error al subir imagen de mantenimiento:', error);
        throw new BadRequestException(
          `Error al subir imagen: ${error.message}`,
        );
      }
    }

    // Preparar datos para el mantenimiento
    const previousLength = record.longitud;
    const newLength = createMaintenanceDto.new_length_meters;
    let lengthChanged = false;

    // Determinar si hay cambio de longitud
    if (newLength !== undefined && newLength !== previousLength) {
      lengthChanged = true;
    }

    // Crear registro de mantenimiento
    const maintenance = this.maintenanceRepository.create({
      record_id: createMaintenanceDto.record_id,
      maintenance_date: maintenanceDate,
      description: createMaintenanceDto.description,
      previous_length_meters: lengthChanged ? previousLength : undefined,
      new_length_meters: lengthChanged ? newLength : undefined,
      image_filename: imageInfo?.filename,
      image_r2_key: imageInfo?.key,
      image_size: imageInfo?.size,
      created_by: userId,
    });

    const savedMaintenance = await this.maintenanceRepository.save(maintenance);

    // Actualizar longitud del registro si cambió
    if (lengthChanged && newLength !== undefined) {
      await this.recordRepository.update(createMaintenanceDto.record_id, {
        longitud: newLength,
      });

      // Registrar cambio en historial de movimientos
      if (userId) {
        const trackingContext: TrackingContext = {
          userId,
          username: undefined, // Se resolverá en el servicio
        };

        await this.movementTrackingService.trackRecordUpdate(
          record.id,
          record.codigo,
          { longitud: previousLength },
          { longitud: newLength },
          trackingContext,
        );
      }

      this.logger.log(
        `Longitud actualizada para línea ${record.codigo}: ${previousLength}m → ${newLength}m`,
      );
    }

    this.logger.log(
      `Mantenimiento registrado: ID ${savedMaintenance.id} para línea ${record.codigo}`,
    );

    return this.mapToResponseDto(savedMaintenance, imageInfo?.publicUrl);
  }

  async findByRecord(recordId: number): Promise<MaintenanceResponseDto[]> {
    const maintenances = await this.maintenanceRepository.find({
      where: { record_id: recordId },
      order: { maintenance_date: 'DESC' },
      relations: ['user'],
    });

    const result: MaintenanceResponseDto[] = [];

    for (const maintenance of maintenances) {
      let imageUrl: string | undefined = undefined;
      if (maintenance.image_r2_key) {
        try {
          imageUrl = await this.getImageUrl(maintenance.image_r2_key);
        } catch (error) {
          this.logger.warn(
            `Error obteniendo URL de imagen para mantenimiento ${maintenance.id}`,
          );
        }
      }

      result.push(this.mapToResponseDto(maintenance, imageUrl));
    }

    return result;
  }

  async findOne(id: number): Promise<MaintenanceResponseDto> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
      relations: ['record', 'user'],
    });

    if (!maintenance) {
      throw new NotFoundException(`Mantenimiento con ID ${id} no encontrado`);
    }

    let imageUrl: string | undefined = undefined;
    if (maintenance.image_r2_key) {
      try {
        imageUrl = await this.getImageUrl(maintenance.image_r2_key);
      } catch (error) {
        this.logger.warn(
          `Error obteniendo URL de imagen para mantenimiento ${id}`,
        );
      }
    }

    return this.mapToResponseDto(maintenance, imageUrl);
  }

  async remove(id: number): Promise<void> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException(`Mantenimiento con ID ${id} no encontrado`);
    }

    // Eliminar imagen de R2 si existe
    if (maintenance.image_r2_key) {
      try {
        await this.r2Service.deleteFile(maintenance.image_r2_key);
      } catch (error) {
        this.logger.warn(
          `Error eliminando imagen de mantenimiento ${id}: ${error.message}`,
        );
      }
    }

    await this.maintenanceRepository.remove(maintenance);
    this.logger.log(`Mantenimiento eliminado: ID ${id}`);
  }

  private async uploadMaintenanceImage(
    file: Express.Multer.File,
    recordId: number,
    userId?: number,
  ): Promise<{
    filename: string;
    key: string;
    size: number;
    publicUrl: string;
  }> {
    // Usar el servicio R2 existente pero con ruta diferente
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const filename = `maintenance-${timestamp}.${fileExtension}`;

    // Estructura: maintenances/record-{id}/maintenance-{timestamp}.jpg
    const key = `maintenances/record-${recordId}/${filename}`;

    // Comprimir imagen usando el servicio existente
    const uploadResult = await this.r2Service.uploadFile(
      file,
      recordId,
      userId,
    );

    // Modificar la key para usar la estructura de maintenances
    const maintenanceKey = key;

    return {
      filename,
      key: maintenanceKey,
      size: uploadResult.size,
      publicUrl: uploadResult.publicUrl.replace(
        uploadResult.key,
        maintenanceKey,
      ),
    };
  }

  private async getImageUrl(key: string): Promise<string> {
    const publicUrl = this.r2Service.getPublicUrl(key);
    if (publicUrl) {
      return publicUrl;
    }
    return await this.r2Service.getSignedDownloadUrl(key);
  }

  private mapToResponseDto(
    maintenance: Maintenance,
    imageUrl?: string,
  ): MaintenanceResponseDto {
    return {
      id: maintenance.id,
      record_id: maintenance.record_id,
      maintenance_date: maintenance.maintenance_date,
      description: maintenance.description,
      previous_length_meters: maintenance.previous_length_meters,
      new_length_meters: maintenance.new_length_meters,
      image_filename: maintenance.image_filename,
      image_url: imageUrl,
      image_size: maintenance.image_size,
      created_at: maintenance.created_at,
      created_by: maintenance.created_by,
      record: maintenance.record
        ? {
            id: maintenance.record.id,
            codigo: maintenance.record.codigo,
            cliente: maintenance.record.cliente || '',
            ubicacion: maintenance.record.ubicacion || '',
          }
        : undefined,
      user: maintenance.user
        ? {
            id: maintenance.user.id,
            nombre: maintenance.user.nombre,
            apellidos: maintenance.user.apellidos || '',
          }
        : undefined,
    };
  }
}
