import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordStatusHistory } from '../entities/record-status-history.entity';
import { Record as RecordEntity } from '../../records/entities/record.entity';

@Injectable()
export class StatusHistoryBusinessService {
  // Estados válidos del sistema
  private readonly validStatuses = [
    'ACTIVO',
    'POR_VENCER',
    'VENCIDO',
    'INACTIVO',
    'MANTENIMIENTO',
  ];

  // Transiciones de estado permitidas
  private readonly allowedTransitions: Record<string, string[]> = {
    ACTIVO: ['POR_VENCER', 'VENCIDO', 'INACTIVO', 'MANTENIMIENTO'],
    POR_VENCER: ['ACTIVO', 'VENCIDO', 'INACTIVO', 'MANTENIMIENTO'],
    VENCIDO: ['ACTIVO', 'INACTIVO', 'MANTENIMIENTO'], // Vencido no puede volver a POR_VENCER directamente
    INACTIVO: ['ACTIVO', 'MANTENIMIENTO'],
    MANTENIMIENTO: ['ACTIVO', 'INACTIVO'],
  };

  // Estados que requieren observación obligatoria
  private readonly statusesRequiringObservation = [
    'VENCIDO',
    'INACTIVO',
    'MANTENIMIENTO',
  ];

  constructor(
    @InjectRepository(RecordStatusHistory)
    private readonly statusHistoryRepository: Repository<RecordStatusHistory>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /**
   * Validar que el estado es válido
   */
  validateStatusValue(estado: string): void {
    if (!this.validStatuses.includes(estado.toUpperCase())) {
      throw new BadRequestException(
        `Estado inválido: ${estado}. Estados válidos: ${this.validStatuses.join(', ')}`,
      );
    }
  }

  /**
   * Validar transición de estado
   */
  async validateStatusTransition(
    registroId: number,
    nuevoEstado: string,
  ): Promise<void> {
    // Obtener el estado actual del registro
    const record = await this.recordRepository.findOne({
      where: { id: registroId },
    });

    if (!record) {
      throw new BadRequestException(
        `Registro con ID ${registroId} no encontrado`,
      );
    }

    const estadoActual = record.estado_actual || 'ACTIVO';
    const nuevoEstadoUpper = nuevoEstado.toUpperCase();

    // Validar que el nuevo estado es válido
    this.validateStatusValue(nuevoEstadoUpper);

    // Si es el mismo estado, permitir (para agregar observaciones)
    if (estadoActual === nuevoEstadoUpper) {
      return;
    }

    // Validar transición permitida
    const transicionesPermitidas = this.allowedTransitions[estadoActual] || [];

    if (!transicionesPermitidas.includes(nuevoEstadoUpper)) {
      throw new BadRequestException(
        `Transición no permitida: ${estadoActual} → ${nuevoEstadoUpper}. ` +
          `Transiciones válidas desde ${estadoActual}: ${transicionesPermitidas.join(', ')}`,
      );
    }
  }

  /**
   * Validar que se proporcione observación cuando es requerida
   */
  validateObservationRequired(estado: string, observacion?: string): void {
    const estadoUpper = estado.toUpperCase();

    if (this.statusesRequiringObservation.includes(estadoUpper)) {
      if (!observacion || observacion.trim().length === 0) {
        throw new BadRequestException(
          `El estado ${estadoUpper} requiere una observación obligatoria`,
        );
      }

      if (observacion.length < 10) {
        throw new BadRequestException(
          `La observación debe tener al menos 10 caracteres para el estado ${estadoUpper}`,
        );
      }
    }
  }

  /**
   * Validar que no se hagan cambios retroactivos sin permisos
   */
  validateRetroactiveChange(fechaCambio: Date, userRole: string): void {
    const now = new Date();
    const diffHours =
      (now.getTime() - fechaCambio.getTime()) / (1000 * 60 * 60);

    // Permitir cambios hasta 24 horas atrás para usuarios normales
    if (diffHours > 24 && userRole !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'No se pueden realizar cambios de estado con fecha anterior a 24 horas. ' +
          'Contacte a un administrador si necesita hacer un cambio retroactivo.',
      );
    }

    // Para administradores, permitir hasta 30 días atrás
    if (diffHours > 24 * 30 && userRole === 'ADMINISTRADOR') {
      throw new BadRequestException(
        'No se pueden realizar cambios de estado con más de 30 días de antigüedad',
      );
    }
  }

  /**
   * Validar frecuencia de cambios (prevenir spam)
   */
  async validateChangeFrequency(registroId: number): Promise<void> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const recentChanges = await this.statusHistoryRepository.count({
      where: {
        registro_id: registroId,
        fecha_cambio: new Date() as any, // Usar raw query para fecha reciente
      },
    });

    // Query más específico para cambios recientes
    const recentChangesCount = await this.statusHistoryRepository
      .createQueryBuilder('history')
      .where('history.registro_id = :registroId', { registroId })
      .andWhere('history.fecha_cambio > :fiveMinutesAgo', { fiveMinutesAgo })
      .getCount();

    if (recentChangesCount >= 3) {
      throw new BadRequestException(
        'Demasiados cambios de estado en poco tiempo. ' +
          'Espere al menos 5 minutos entre cambios para el mismo registro.',
      );
    }
  }

  /**
   * Obtener el último estado de un registro
   */
  async getLastStatus(registroId: number): Promise<RecordStatusHistory | null> {
    return await this.statusHistoryRepository.findOne({
      where: { registro_id: registroId },
      order: { fecha_cambio: 'DESC' },
    });
  }

  /**
   * Validar que existe el registro antes de crear historial
   */
  async validateRecordExists(registroId: number): Promise<void> {
    const record = await this.recordRepository.findOne({
      where: { id: registroId },
    });

    if (!record) {
      throw new BadRequestException(
        `El registro con ID ${registroId} no existe`,
      );
    }
  }

  /**
   * Generar mensaje automático según el cambio de estado
   */
  generateAutoMessage(estadoAnterior: string, estadoNuevo: string): string {
    return `Estado cambiado automáticamente de ${estadoAnterior} a ${estadoNuevo}`;
  }

  /**
   * Validar longitud de observación
   */
  validateObservationLength(observacion?: string): void {
    if (observacion && observacion.length > 1000) {
      throw new BadRequestException(
        'La observación no puede exceder 1000 caracteres',
      );
    }
  }

  /**
   * Obtener configuración de transiciones para el frontend
   */
  getTransitionRules(): {
    validStatuses: string[];
    allowedTransitions: Record<string, string[]>;
    statusesRequiringObservation: string[];
  } {
    return {
      validStatuses: this.validStatuses,
      allowedTransitions: this.allowedTransitions,
      statusesRequiringObservation: this.statusesRequiringObservation,
    };
  }
}
