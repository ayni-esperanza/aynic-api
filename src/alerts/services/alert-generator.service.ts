import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Not } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Alert, AlertType, AlertPriority } from '../entities/alert.entity';
import { Record as RecordEntity } from '../../records/entities/record.entity';
import { StatusCalculatorService } from '../../records/services/status-calculator.service';

interface StatusInfo {
  status: string;
  daysRemaining: number;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class AlertGeneratorService {
  private readonly logger = new Logger(AlertGeneratorService.name);
  private readonly isEnabled: boolean;

  // Configuraciones de frecuencia (en días)
  private readonly ALERT_FREQUENCIES = {
    [AlertType.POR_VENCER]: 7, // Cada 7 días
    [AlertType.VENCIDO]: 3, // Cada 3 días
    [AlertType.CRITICO]: 1, // Diario
  };

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly statusCalculator: StatusCalculatorService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('ALERT_GENERATION_ENABLED') === 'true';

    if (this.isEnabled) {
      this.logger.log('Generador de alertas habilitado');
      this.logger.log(
        `Frecuencias configuradas: POR_VENCER=${this.ALERT_FREQUENCIES.POR_VENCER}d, VENCIDO=${this.ALERT_FREQUENCIES.VENCIDO}d, CRITICO=${this.ALERT_FREQUENCIES.CRITICO}d`,
      );
    } else {
      this.logger.log('Generador de alertas deshabilitado');
    }
  }

  /**
   * Job que genera alertas diariamente a las 06:00 AM
   */
  @Cron('0 6 * * *')
  async generateDailyAlerts(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Iniciando generación diaria de alertas...');

    try {
      const startTime = Date.now();

      // Obtener todos los registros con fecha de caducidad
      const records = await this.recordRepository.find({
        where: {
          fecha_caducidad: Not(IsNull()),
        },
        select: [
          'id',
          'codigo',
          'fecha_caducidad',
          'estado_actual',
          'cliente',
        ],
      });

      if (records.length === 0) {
        this.logger.log(
          'No hay registros con fecha de caducidad para evaluar',
        );
        return;
      }

      let alertsGenerated = 0;

      for (const record of records) {
        const statusInfo = this.statusCalculator.getStatusInfo(
          record.fecha_caducidad,
        );

        // Solo crear alertas para registros que necesitan atención
        if (
          statusInfo.priority === 'medium' ||
          statusInfo.priority === 'high' ||
          statusInfo.priority === 'critical'
        ) {
          const alertType = this.getAlertTypeFromStatus(statusInfo);
          const shouldCreateAlert = await this.shouldCreateAlert(
            record.id,
            alertType,
          );

          if (shouldCreateAlert) {
            await this.createAlert(record, statusInfo, alertType);
            alertsGenerated++;
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Generación de alertas completada en ${duration}ms:`);
      this.logger.log(`Registros evaluados: ${records.length}`);
      this.logger.log(`Alertas generadas: ${alertsGenerated}`);
    } catch (error) {
      this.logger.error('Error durante la generación de alertas:', error);
    }
  }

  /**
   * Crear una alerta para un registro específico
   */
  private async createAlert(
    record: RecordEntity,
    statusInfo: StatusInfo,
    alertType: AlertType,
  ): Promise<Alert> {
    const alert = this.alertRepository.create({
      tipo: alertType,
      registro_id: record.id,
      mensaje: this.generateAlertMessage(record, statusInfo),
      prioridad: this.mapPriorityToAlertPriority(statusInfo.priority),
      metadata: JSON.stringify({
        codigo: record.codigo,
        cliente: record.cliente,
        fecha_caducidad: record.fecha_caducidad,
        dias_restantes: statusInfo.daysRemaining,
        estado_actual: record.estado_actual,
      }),
    });

    const savedAlert = await this.alertRepository.save(alert);

    this.logger.debug(
      `Alerta creada: ${alertType} para registro ${record.codigo}`,
    );

    return savedAlert;
  }

  /**
   * Determinar si se debe crear una alerta basado en la frecuencia
   */
  private async shouldCreateAlert(
    registroId: number,
    alertType: AlertType,
  ): Promise<boolean> {
    const frequencyDays = this.ALERT_FREQUENCIES[alertType];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - frequencyDays);

    // Buscar si ya existe una alerta reciente del mismo tipo para este registro
    const existingAlert = await this.alertRepository.findOne({
      where: {
        registro_id: registroId,
        tipo: alertType,
        fecha_creada: MoreThan(cutoffDate),
      },
      order: { fecha_creada: 'DESC' },
    });

    return !existingAlert;
  }

  /**
   * Mapear el status del calculador a tipo de alerta
   */
  private getAlertTypeFromStatus(statusInfo: StatusInfo): AlertType {
    if (statusInfo.priority === 'critical') {
      return AlertType.CRITICO;
    } else if (statusInfo.status === 'VENCIDO') {
      return AlertType.VENCIDO;
    } else if (statusInfo.status === 'POR_VENCER') {
      return AlertType.POR_VENCER;
    }

    return AlertType.POR_VENCER; // Default
  }

  /**
   * Mapear prioridad del status a prioridad de alerta
   */
  private mapPriorityToAlertPriority(priority: string): AlertPriority {
    switch (priority) {
      case 'critical':
        return AlertPriority.CRITICAL;
      case 'high':
        return AlertPriority.HIGH;
      case 'medium':
        return AlertPriority.MEDIUM;
      case 'low':
        return AlertPriority.LOW;
      default:
        return AlertPriority.MEDIUM;
    }
  }

  /**
   * Generar mensaje de alerta personalizado
   */
  private generateAlertMessage(
    record: RecordEntity,
    statusInfo: StatusInfo,
  ): string {
    const cliente = record.cliente ? ` (${record.cliente})` : '';

    switch (statusInfo.priority) {
      case 'critical':
        return `CRÍTICO: El registro ${record.codigo}${cliente} lleva ${Math.abs(statusInfo.daysRemaining)} días vencido`;
      case 'high':
        if (statusInfo.daysRemaining < 0) {
          return `URGENTE: El registro ${record.codigo}${cliente} venció hace ${Math.abs(statusInfo.daysRemaining)} días`;
        } else if (statusInfo.daysRemaining === 0) {
          return `ATENCIÓN: El registro ${record.codigo}${cliente} vence HOY`;
        } else {
          return `URGENTE: El registro ${record.codigo}${cliente} vence en ${statusInfo.daysRemaining} días`;
        }
      case 'medium':
        return `AVISO: El registro ${record.codigo}${cliente} vence en ${statusInfo.daysRemaining} días`;
      default:
        return `El registro ${record.codigo}${cliente} requiere atención: ${statusInfo.message}`;
    }
  }

  /**
   * Generar alertas manualmente (para endpoint de admin)
   */
  async generateAlertsManually(): Promise<{
    evaluated: number;
    generated: number;
    alerts: Alert[];
  }> {
    this.logger.log('🔧 Generación manual de alertas iniciada...');

    const records = await this.recordRepository.find({
      where: {
        fecha_caducidad: Not(IsNull()),
      },
      select: ['id', 'codigo', 'fecha_caducidad', 'estado_actual', 'cliente'],
    });

    const generatedAlerts: Alert[] = [];

    for (const record of records) {
      const statusInfo = this.statusCalculator.getStatusInfo(
        record.fecha_caducidad,
      );

      if (
        statusInfo.priority === 'medium' ||
        statusInfo.priority === 'high' ||
        statusInfo.priority === 'critical'
      ) {
        const alertType = this.getAlertTypeFromStatus(statusInfo);

        // En modo manual, crear alertas sin verificar frecuencia
        const alert = await this.createAlert(record, statusInfo, alertType);
        generatedAlerts.push(alert);
      }
    }

    this.logger.log(
      `✅ Generación manual completada: ${generatedAlerts.length} alertas creadas`,
    );

    return {
      evaluated: records.length,
      generated: generatedAlerts.length,
      alerts: generatedAlerts,
    };
  }

  /**
   * Verificar si el servicio está habilitado
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
