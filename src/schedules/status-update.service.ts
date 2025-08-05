import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Record } from '../records/entities/record.entity';
import { StatusCalculatorService } from '../records/services/status-calculator.service';

@Injectable()
export class StatusUpdateService {
  private readonly logger = new Logger(StatusUpdateService.name);
  private readonly isEnabled: boolean;

  constructor(
    @InjectRepository(Record)
    private readonly recordRepository: Repository<Record>,
    private readonly statusCalculator: StatusCalculatorService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get<string>('STATUS_CHECK_ENABLED') === 'true';

    if (this.isEnabled) {
      this.logger.log('Actualizador automático de estados habilitado');
      this.statusCalculator.logConfiguration();
    } else {
      this.logger.log('Actualizador automático de estados deshabilitado');
    }
  }

  /**
   * Job que se ejecuta diariamente a las 00:01 AM
   * Actualiza todos los estados de registros automáticamente
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Cron('1 0 * * *')
  async updateAllRecordStatuses(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Iniciando actualización automática de estados...');

    try {
      const startTime = Date.now();

      // Obtener todos los registros que SÍ tienen fecha de caducidad
      const recordsWithDate = await this.recordRepository.find({
        where: {
          fecha_caducidad: Not(IsNull()),
        },
        select: ['id', 'codigo', 'fecha_caducidad', 'estado_actual'],
      });

      if (recordsWithDate.length === 0) {
        this.logger.log(
          ' No se encontraron registros con fecha de caducidad',
        );
        return;
      }

      let updatedCount = 0;
      const updates: Array<{
        id: number;
        codigo: string;
        oldStatus: string;
        newStatus: string;
      }> = [];

      // Procesar cada registro
      for (const record of recordsWithDate) {
        const currentStatus = record.estado_actual || 'ACTIVO';
        const calculatedStatus = this.statusCalculator.calculateStatus(
          record.fecha_caducidad,
        );
        const calculatedStatusString = calculatedStatus.toString();

        // Solo actualizar si el estado cambió
        if (currentStatus !== calculatedStatusString) {
          await this.recordRepository.update(record.id, {
            estado_actual: calculatedStatusString,
          });

          updates.push({
            id: record.id,
            codigo: record.codigo,
            oldStatus: currentStatus,
            newStatus: calculatedStatusString,
          });

          updatedCount++;
        }
      }

      const duration = Date.now() - startTime;

      // Log de resultados
      this.logger.log(`Actualización completada en ${duration}ms:`);
      this.logger.log(`Registros procesados: ${recordsWithDate.length}`);
      this.logger.log(`Registros actualizados: ${updatedCount}`);

      if (updates.length > 0) {
        this.logger.log('Cambios realizados:');
        updates.forEach((update) => {
          this.logger.log(
            `   - ${update.codigo}: ${update.oldStatus} → ${update.newStatus}`,
          );
        });
      }
    } catch (error) {
      this.logger.error('Error durante la actualización automática:', error);
      throw error;
    }
  }

  /**
   * Método manual para recalcular estados (para endpoint de admin)
   */
  async manualStatusUpdate(): Promise<{
    processed: number;
    updated: number;
    updates: Array<{
      codigo: string;
      oldStatus: string;
      newStatus: string;
      statusInfo: any;
    }>;
  }> {
    this.logger.log('Iniciando actualización manual de estados...');

    const recordsWithDate = await this.recordRepository.find({
      where: {
        fecha_caducidad: Not(IsNull()),
      },
      select: ['id', 'codigo', 'fecha_caducidad', 'estado_actual'],
    });

    let updatedCount = 0;
    const updates: Array<{
      codigo: string;
      oldStatus: string;
      newStatus: string;
      statusInfo: any;
    }> = [];

    for (const record of recordsWithDate) {
      const currentStatus = record.estado_actual || 'ACTIVO';
      const calculatedStatus = this.statusCalculator.calculateStatus(
        record.fecha_caducidad,
      );
      const calculatedStatusString = calculatedStatus.toString();
      const statusInfo = this.statusCalculator.getStatusInfo(
        record.fecha_caducidad,
      );

      // Actualizar siempre en modo manual (para forzar sincronización)
      await this.recordRepository.update(record.id, {
        estado_actual: calculatedStatusString,
      });

      updates.push({
        codigo: record.codigo,
        oldStatus: currentStatus,
        newStatus: calculatedStatusString,
        statusInfo,
      });

      if (currentStatus !== calculatedStatusString) {
        updatedCount++;
      }
    }

    this.logger.log(
      `Actualización manual completada: ${updatedCount}/${recordsWithDate.length} cambios`,
    );

    return {
      processed: recordsWithDate.length,
      updated: updatedCount,
      updates,
    };
  }

  /**
   * Obtener estadísticas actuales de estados
   */
  async getStatusStatistics(): Promise<{
    total: number;
    activos: number;
    porVencer: number;
    vencidos: number;
    criticos: number;
    ultimaActualizacion: Date | null;
  }> {
    // Obtener registros con fecha de caducidad
    const recordsWithDate = await this.recordRepository.find({
      where: {
        fecha_caducidad: Not(IsNull()),
      },
      select: ['fecha_caducidad'],
    });

    const fechas = recordsWithDate.map((r) => r.fecha_caducidad);
    const stats = this.statusCalculator.getStatusStatistics(fechas);

    return {
      ...stats,
      ultimaActualizacion: new Date(),
    };
  }

  /**
   * Verificar si el servicio está habilitado
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
