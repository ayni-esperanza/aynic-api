import { Injectable, Logger } from '@nestjs/common';
import { RecordMovementHistoryService } from './record-movement-history.service';
import { MovementAction } from './entities/record-movement-history.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';

export interface TrackingContext {
  userId?: number;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MovementTrackingService {
  private readonly logger = new Logger(MovementTrackingService.name);

  constructor(
    private readonly movementHistoryService: RecordMovementHistoryService,
  ) {}

  /**
   * Registrar creación de registro
   */
  async trackRecordCreation(
    record: RecordEntity,
    context: TrackingContext,
  ): Promise<void> {
    await this.movementHistoryService.createMovementHistory(
      {
        record_id: record.id,
        action: MovementAction.CREATE,
        description: `Registro creado: ${record.codigo}`,
        user_id: context.userId,
        username: context.username,
        new_values: JSON.stringify(this.extractRecordValues(record)),
        changed_fields: JSON.stringify(
          Object.keys(this.extractRecordValues(record)),
        ),
        record_code: record.codigo,
        is_record_active: true,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar actualización de registro
   */
  async trackRecordUpdate(
    recordId: number,
    recordCode: string,
    previousValues: Partial<RecordEntity>,
    newValues: Partial<RecordEntity>,
    context: TrackingContext,
  ): Promise<void> {
    // Determinar campos que cambiaron
    const changedFields = this.getChangedFields(previousValues, newValues);

    if (changedFields.length === 0) {
      return; // No hubo cambios reales
    }

    // Crear descripción detallada
    const description = this.buildUpdateDescription(
      recordCode,
      changedFields,
      previousValues,
      newValues,
    );

    await this.movementHistoryService.createMovementHistory(
      {
        record_id: recordId,
        action: MovementAction.UPDATE,
        description,
        user_id: context.userId,
        username: context.username,
        previous_values: JSON.stringify(previousValues),
        new_values: JSON.stringify(newValues),
        changed_fields: JSON.stringify(changedFields),
        record_code: recordCode,
        is_record_active: true,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar eliminación de registro
   */
  async trackRecordDeletion(
    record: RecordEntity,
    context: TrackingContext,
  ): Promise<void> {
    await this.movementHistoryService.createMovementHistory(
      {
        record_id: record.id,
        action: MovementAction.DELETE,
        description: `Registro eliminado: ${record.codigo}`,
        user_id: context.userId,
        username: context.username,
        previous_values: JSON.stringify(this.extractRecordValues(record)),
        record_code: record.codigo,
        is_record_active: false,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar cambio de estado
   */
  async trackStatusChange(
    recordId: number,
    recordCode: string,
    previousStatus: string,
    newStatus: string,
    context: TrackingContext,
    observation?: string,
  ): Promise<void> {
    const description = `Estado cambiado de "${previousStatus}" a "${newStatus}"${
      observation ? ` - ${observation}` : ''
    }`;

    await this.movementHistoryService.createMovementHistory(
      {
        record_id: recordId,
        action: MovementAction.STATUS_CHANGE,
        description,
        user_id: context.userId,
        username: context.username,
        previous_values: JSON.stringify({ estado_actual: previousStatus }),
        new_values: JSON.stringify({ estado_actual: newStatus }),
        changed_fields: JSON.stringify(['estado_actual']),
        record_code: recordCode,
        is_record_active: true,
        additional_metadata: observation
          ? JSON.stringify({ observation })
          : undefined,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar subida de imagen
   */
  async trackImageUpload(
    recordId: number,
    recordCode: string,
    imageInfo: { filename: string; size: number; originalName: string },
    context: TrackingContext,
  ): Promise<void> {
    await this.movementHistoryService.createMovementHistory(
      {
        record_id: recordId,
        action: MovementAction.IMAGE_UPLOAD,
        description: `Imagen subida: ${imageInfo.originalName} (${Math.round(imageInfo.size / 1024)}KB)`,
        user_id: context.userId,
        username: context.username,
        new_values: JSON.stringify(imageInfo),
        record_code: recordCode,
        is_record_active: true,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar reemplazo de imagen
   */
  async trackImageReplace(
    recordId: number,
    recordCode: string,
    oldImageInfo: { filename: string; size: number },
    newImageInfo: { filename: string; size: number; originalName: string },
    context: TrackingContext,
  ): Promise<void> {
    await this.movementHistoryService.createMovementHistory(
      {
        record_id: recordId,
        action: MovementAction.IMAGE_REPLACE,
        description: `Imagen reemplazada: ${newImageInfo.originalName} (${Math.round(newImageInfo.size / 1024)}KB)`,
        user_id: context.userId,
        username: context.username,
        previous_values: JSON.stringify(oldImageInfo),
        new_values: JSON.stringify(newImageInfo),
        record_code: recordCode,
        is_record_active: true,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Registrar eliminación de imagen
   */
  async trackImageDeletion(
    recordId: number,
    recordCode: string,
    imageInfo: { filename: string; size: number },
    context: TrackingContext,
  ): Promise<void> {
    await this.movementHistoryService.createMovementHistory(
      {
        record_id: recordId,
        action: MovementAction.IMAGE_DELETE,
        description: `Imagen eliminada: ${imageInfo.filename}`,
        user_id: context.userId,
        username: context.username,
        previous_values: JSON.stringify(imageInfo),
        record_code: recordCode,
        is_record_active: true,
      },
      context.ipAddress,
      context.userAgent,
    );
  }

  /**
   * Extraer valores relevantes de un registro
   */
  private extractRecordValues(record: RecordEntity): Partial<RecordEntity> {
    return {
      codigo: record.codigo,
      cliente: record.cliente,
      equipo: record.equipo,
      anclaje_equipos: record.anclaje_equipos,
      fv_anios: record.fv_anios,
      fv_meses: record.fv_meses,
      fecha_instalacion: record.fecha_instalacion,
      longitud: record.longitud,
      observaciones: record.observaciones,
      seec: record.seec,
      tipo_linea: record.tipo_linea,
      ubicacion: record.ubicacion,
      fecha_caducidad: record.fecha_caducidad,
      estado_actual: record.estado_actual,
    };
  }

  /**
   * Determinar campos que cambiaron
   */
  private getChangedFields(
    previous: Partial<RecordEntity>,
    current: Partial<RecordEntity>,
  ): string[] {
    const changed: string[] = [];

    for (const key in current) {
      if (previous[key] !== current[key]) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Construir descripción detallada de actualización
   */
  private buildUpdateDescription(
    recordCode: string,
    changedFields: string[],
    previousValues: Partial<RecordEntity>,
    newValues: Partial<RecordEntity>,
  ): string {
    const fieldLabels: Record<string, string> = {
      codigo: 'Código',
      cliente: 'Cliente',
      equipo: 'Equipo',
      anclaje_equipos: 'Anclaje de Equipos',
      fv_anios: 'Años de Vida Útil',
      fv_meses: 'Meses de Vida Útil',
      fecha_instalacion: 'Fecha de Instalación',
      longitud: 'Longitud',
      observaciones: 'Observaciones',
      seec: 'SEEC',
      tipo_linea: 'Tipo de Línea',
      ubicacion: 'Ubicación',
      fecha_caducidad: 'Fecha de Caducidad',
      estado_actual: 'Estado Actual',
    };

    if (changedFields.length === 1) {
      const field = changedFields[0];
      const label = fieldLabels[field] || field;
      const oldValue = previousValues[field] || 'N/A';
      const newValue = newValues[field] || 'N/A';

      return `${label} actualizado: "${oldValue}" → "${newValue}"`;
    }

    const fieldDescriptions = changedFields.map((field) => {
      const label = fieldLabels[field] || field;
      return label;
    });

    return `Registro ${recordCode} actualizado: ${fieldDescriptions.join(', ')}`;
  }
}
