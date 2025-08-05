import { Injectable, Logger } from '@nestjs/common';

export enum RecordStatus {
  ACTIVO = 'ACTIVO',
  POR_VENCER = 'POR_VENCER',
  VENCIDO = 'VENCIDO',
}

@Injectable()
export class StatusCalculatorService {
  private readonly logger = new Logger(StatusCalculatorService.name);

  // Configuración de umbrales desde variables de entorno
  private readonly DAYS_TO_EXPIRE_WARNING =
    Number(process.env.DAYS_TO_EXPIRE_WARNING) || 30;
  private readonly DAYS_TO_CRITICAL =
    Number(process.env.DAYS_TO_CRITICAL) || 60;

  /**
   * Calcula el estado de un registro basado en su fecha de caducidad
   */
  calculateStatus(fechaCaducidad: Date | null): RecordStatus {
    if (!fechaCaducidad) {
      return RecordStatus.ACTIVO; // Si no hay fecha, asumimos activo
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día

    const caducidad = new Date(fechaCaducidad);
    caducidad.setHours(0, 0, 0, 0); // Normalizar a inicio del día

    const diffTime = caducidad.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Lógica de estados
    if (diffDays < 0) {
      return RecordStatus.VENCIDO; // Ya pasó la fecha
    } else if (diffDays <= this.DAYS_TO_EXPIRE_WARNING) {
      return RecordStatus.POR_VENCER; // Falta 30 días o menos
    } else {
      return RecordStatus.ACTIVO; // Más de 30 días
    }
  }

  /**
   * Obtiene información detallada del estado
   */
  getStatusInfo(fechaCaducidad: Date | null): {
    status: RecordStatus;
    daysRemaining: number;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (!fechaCaducidad) {
      return {
        status: RecordStatus.ACTIVO,
        daysRemaining: Infinity,
        message: 'Sin fecha de caducidad definida',
        priority: 'low',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const caducidad = new Date(fechaCaducidad);
    caducidad.setHours(0, 0, 0, 0);

    const diffTime = caducidad.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const status = this.calculateStatus(fechaCaducidad);

    let message: string;
    let priority: 'low' | 'medium' | 'high' | 'critical';

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      if (daysOverdue > this.DAYS_TO_CRITICAL) {
        message = `Vencido hace ${daysOverdue} días - CRÍTICO`;
        priority = 'critical';
      } else {
        message = `Vencido hace ${daysOverdue} días`;
        priority = 'high';
      }
    } else if (diffDays === 0) {
      message = 'Vence hoy';
      priority = 'high';
    } else if (diffDays <= this.DAYS_TO_EXPIRE_WARNING) {
      message = `Vence en ${diffDays} días`;
      priority = diffDays <= 7 ? 'high' : 'medium';
    } else {
      message = `Vence en ${diffDays} días`;
      priority = 'low';
    }

    return {
      status,
      daysRemaining: diffDays,
      message,
      priority,
    };
  }

  /**
   * Determina si un registro necesita alerta
   */
  needsAlert(fechaCaducidad: Date | null): boolean {
    const info = this.getStatusInfo(fechaCaducidad);
    return (
      info.priority === 'medium' ||
      info.priority === 'high' ||
      info.priority === 'critical'
    );
  }

  /**
   * Obtiene estadísticas de estados para un conjunto de registros
   */
  getStatusStatistics(fechasCaducidad: (Date | null)[]): {
    total: number;
    activos: number;
    porVencer: number;
    vencidos: number;
    criticos: number;
  } {
    const stats = {
      total: fechasCaducidad.length,
      activos: 0,
      porVencer: 0,
      vencidos: 0,
      criticos: 0,
    };

    fechasCaducidad.forEach((fecha) => {
      const info = this.getStatusInfo(fecha);

      switch (info.status) {
        case RecordStatus.ACTIVO:
          stats.activos++;
          break;
        case RecordStatus.POR_VENCER:
          stats.porVencer++;
          break;
        case RecordStatus.VENCIDO:
          stats.vencidos++;
          if (info.priority === 'critical') {
            stats.criticos++;
          }
          break;
        default:
          // Manejar casos no esperados
          break;
      }
    });

    return stats;
  }

  /**
   * Valida si una transición de estado es permitida
   */
  isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    // Permitir cualquier transición manual por ahora
    // En el futuro se pueden agregar reglas más estrictas
    const validStatuses = Object.values(RecordStatus) as string[];
    return validStatuses.includes(newStatus);
  }

  /**
   * Log de información de configuración
   */
  logConfiguration(): void {
    this.logger.log(`Configuración de Estados:`);
    this.logger.log(`- Días para advertencia: ${this.DAYS_TO_EXPIRE_WARNING}`);
    this.logger.log(`- Días para crítico: ${this.DAYS_TO_CRITICAL}`);
  }
}
