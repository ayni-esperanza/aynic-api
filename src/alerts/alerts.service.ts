/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, In } from 'typeorm';
import { Alert, AlertType, AlertPriority } from './entities/alert.entity';
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertFiltersDto,
} from './dto/alert.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {}

  /**
   * Crear una nueva alerta
   */
  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const alert = this.alertRepository.create(createAlertDto);
    return await this.alertRepository.save(alert);
  }

  /**
   * Obtener alertas con filtros y paginación
   */
  async findAll(filters: AlertFiltersDto): Promise<PaginatedResponse<Alert>> {
    const page = filters.getPage();
    const limit = filters.getLimit();
    const sortBy = filters.getSortBy();
    const sortOrder = filters.getSortOrder();

    // Construir condiciones WHERE
    const whereConditions: any = {};

    if (filters.tipo) {
      whereConditions.tipo = filters.tipo;
    }

    if (filters.registro_id) {
      whereConditions.registro_id = filters.registro_id;
    }

    if (filters.leida !== undefined) {
      whereConditions.leida = filters.leida;
    }

    if (filters.prioridad) {
      whereConditions.prioridad = filters.prioridad;
    }

    // Filtros de fecha usando Between
    if (filters.fecha_desde && filters.fecha_hasta) {
      whereConditions.fecha_creada = Between(
        new Date(filters.fecha_desde),
        new Date(filters.fecha_hasta),
      );
    } else if (filters.fecha_desde) {
      whereConditions.fecha_creada = Between(
        new Date(filters.fecha_desde),
        new Date('2099-12-31'),
      );
    } else if (filters.fecha_hasta) {
      whereConditions.fecha_creada = Between(
        new Date('1900-01-01'),
        new Date(filters.fecha_hasta),
      );
    }

    const options: FindManyOptions<Alert> = {
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['record'],
    };

    const [alerts, total] = await this.alertRepository.findAndCount(options);

    return PaginationHelper.createResponse(alerts, total, page, limit);
  }

  /**
   * Obtener una alerta por ID
   */
  async findOne(id: number): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['record'],
    });

    if (!alert) {
      throw new NotFoundException(`Alerta con ID ${id} no encontrada`);
    }

    return alert;
  }

  /**
   * Actualizar una alerta
   */
  async update(id: number, updateAlertDto: UpdateAlertDto): Promise<Alert> {
    const alert = await this.findOne(id);

    // Crear objeto de actualización
    const updateData: Record<string, any> = { ...updateAlertDto };

    // Si se marca como leída, agregar fecha de lectura
    if (updateAlertDto.leida === true && !alert.leida) {
      updateData.fecha_leida = new Date();
    }

    await this.alertRepository.update(id, updateData);
    return await this.findOne(id);
  }

  /**
   * Eliminar una alerta
   */
  async remove(id: number): Promise<void> {
    const alert = await this.findOne(id);
    await this.alertRepository.remove(alert);
  }

  /**
   * Obtener contador de alertas no leídas
   */
  async getUnreadCount(): Promise<{ count: number }> {
    const count = await this.alertRepository.count({
      where: { leida: false },
    });

    return { count };
  }

  /**
   * Marcar una alerta como leída
   */
  async markAsRead(id: number): Promise<Alert> {
    const updateData: Record<string, any> = {
      leida: true,
      fecha_leida: new Date(),
    };

    await this.alertRepository.update(id, updateData);
    return await this.findOne(id);
  }

  /**
   * Marcar todas las alertas como leídas
   */
  async markAllAsRead(): Promise<{ updated: number }> {
    const result = await this.alertRepository.update(
      { leida: false },
      {
        leida: true,
        fecha_leida: new Date(),
      },
    );

    return { updated: result.affected || 0 };
  }

  /**
   * Obtener resumen ejecutivo de alertas
   */
  async getDashboardSummary(): Promise<{
    total: number;
    noLeidas: number;
    porTipo: Array<{ tipo: AlertType; count: number }>;
    porPrioridad: Array<{ prioridad: AlertPriority; count: number }>;
    recientes: Alert[];
    criticas: Alert[];
  }> {
    // Contadores básicos
    const total = await this.alertRepository.count();
    const noLeidas = await this.alertRepository.count({
      where: { leida: false },
    });

    // Estadísticas por tipo
    const porTipoQuery = await this.alertRepository
      .createQueryBuilder('alert')
      .select('alert.tipo', 'tipo')
      .addSelect('COUNT(*)', 'count')
      .where('alert.leida = :leida', { leida: false })
      .groupBy('alert.tipo')
      .getRawMany();

    interface TipoQueryResult {
      tipo: string;
      count: string;
    }

    const porTipo = porTipoQuery.map((item: TipoQueryResult) => ({
      tipo: item.tipo as AlertType,
      count: parseInt(item.count, 10),
    }));

    // Estadísticas por prioridad
    const porPrioridadQuery = await this.alertRepository
      .createQueryBuilder('alert')
      .select('alert.prioridad', 'prioridad')
      .addSelect('COUNT(*)', 'count')
      .where('alert.leida = :leida', { leida: false })
      .groupBy('alert.prioridad')
      .getRawMany();

    interface PrioridadQueryResult {
      prioridad: string;
      count: string;
    }

    const porPrioridad = porPrioridadQuery.map(
      (item: PrioridadQueryResult) => ({
        prioridad: item.prioridad as AlertPriority,
        count: parseInt(item.count, 10),
      }),
    );

    // Alertas recientes (últimas 10)
    const recientes = await this.alertRepository.find({
      order: { fecha_creada: 'DESC' },
      take: 10,
      relations: ['record'],
    });

    // Alertas críticas no leídas
    const criticas = await this.alertRepository.find({
      where: {
        leida: false,
        prioridad: In([AlertPriority.CRITICAL, AlertPriority.HIGH]),
      },
      order: { fecha_creada: 'DESC' },
      take: 20,
      relations: ['record'],
    });

    return {
      total,
      noLeidas,
      porTipo,
      porPrioridad,
      recientes,
      criticas,
    };
  }

  /**
   * Obtener alertas por registro específico
   */
  async getAlertsByRecord(registroId: number): Promise<Alert[]> {
    return await this.alertRepository.find({
      where: { registro_id: registroId },
      order: { fecha_creada: 'DESC' },
      relations: ['record'],
    });
  }

  /**
   * Obtener alertas críticas activas
   */
  async getCriticalAlerts(): Promise<Alert[]> {
    return await this.alertRepository.find({
      where: {
        leida: false,
        prioridad: AlertPriority.CRITICAL,
      },
      order: { fecha_creada: 'DESC' },
      relations: ['record'],
    });
  }

  /**
   * Limpiar alertas antiguas (para mantenimiento)
   */
  async cleanOldAlerts(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.alertRepository
      .createQueryBuilder()
      .delete()
      .where('fecha_creada < :cutoffDate AND leida = :leida', {
        cutoffDate,
        leida: true,
      })
      .execute();

    return result.affected || 0;
  }

  /**
   * Obtener estadísticas de alertas por período
   */
  async getAlertStatsByPeriod(
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<Array<{ fecha: string; tipo: AlertType; count: number }>> {
    const query = this.alertRepository
      .createQueryBuilder('alert')
      .select('DATE(alert.fecha_creada)', 'fecha')
      .addSelect('alert.tipo', 'tipo')
      .addSelect('COUNT(*)', 'count')
      .where('alert.fecha_creada BETWEEN :inicio AND :fin', {
        inicio: fechaInicio,
        fin: fechaFin,
      })
      .groupBy('DATE(alert.fecha_creada), alert.tipo')
      .orderBy('fecha', 'DESC')
      .addOrderBy('count', 'DESC');

    const result = await query.getRawMany();

    interface PeriodQueryResult {
      fecha: string;
      tipo: string;
      count: string;
    }

    return result.map((item: PeriodQueryResult) => ({
      fecha: item.fecha,
      tipo: item.tipo as AlertType,
      count: parseInt(item.count, 10),
    }));
  }
}
