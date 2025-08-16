import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, ILike } from 'typeorm';
import {
  RecordMovementHistory,
  MovementAction,
} from './entities/record-movement-history.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateMovementHistoryDto,
  MovementHistoryFiltersDto,
  MovementHistoryResponseDto,
} from './dto/record-movement-history.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

@Injectable()
export class RecordMovementHistoryService {
  private readonly logger = new Logger(RecordMovementHistoryService.name);

  constructor(
    @InjectRepository(RecordMovementHistory)
    private readonly movementHistoryRepository: Repository<RecordMovementHistory>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crear entrada en el historial de movimientos
   */
  async createMovementHistory(
    data: CreateMovementHistoryDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RecordMovementHistory> {
    // Obtener información adicional del registro
    const record = await this.recordRepository.findOne({
      where: { id: data.record_id },
    });

    // Obtener información del usuario si existe
    let user: User | null = null;
    if (data.user_id) {
      user = await this.userRepository.findOne({
        where: { id: data.user_id },
      });
    }

    const movement = this.movementHistoryRepository.create({
      ...data,
      record_code: record?.codigo || null,
      username: data.username || user?.usuario || 'Sistema',
      is_record_active: record ? true : false,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    const savedMovement = await this.movementHistoryRepository.save(movement);

    this.logger.log(
      `Movimiento registrado: ${data.action} - Record ${data.record_id} - Usuario ${movement.username}`,
    );

    return savedMovement;
  }

  /**
   * Obtener historial con filtros y paginación
   */
  async findAll(
    filters: MovementHistoryFiltersDto,
  ): Promise<PaginatedResponse<MovementHistoryResponseDto>> {
    const page = filters.getPage();
    const limit = filters.getLimit();
    const sortBy = filters.getSortBy() || 'action_date';
    const sortOrder = filters.getSortOrder() || 'DESC';

    // Construir condiciones WHERE
    const whereConditions: any = {};

    if (filters.record_id) {
      whereConditions.record_id = filters.record_id;
    }

    if (filters.action) {
      whereConditions.action = filters.action;
    }

    if (filters.user_id) {
      whereConditions.user_id = filters.user_id;
    }

    if (filters.username) {
      whereConditions.username = filters.username;
    }

    if (filters.record_code) {
      whereConditions.record_code = ILike(`%${filters.record_code}%`);
    }

    if (filters.is_record_active !== undefined) {
      whereConditions.is_record_active = filters.is_record_active;
    }

    if (filters.search) {
      whereConditions.description = ILike(`%${filters.search}%`);
    }

    // Filtros de fecha
    if (filters.date_from && filters.date_to) {
      whereConditions.action_date = Between(
        new Date(filters.date_from),
        new Date(filters.date_to),
      );
    } else if (filters.date_from) {
      whereConditions.action_date = Between(
        new Date(filters.date_from),
        new Date('2099-12-31'),
      );
    } else if (filters.date_to) {
      whereConditions.action_date = Between(
        new Date('1900-01-01'),
        new Date(filters.date_to),
      );
    }

    const options: FindManyOptions<RecordMovementHistory> = {
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    };

    const [movements, total] =
      await this.movementHistoryRepository.findAndCount(options);

    // Mapear a DTOs de respuesta
    const responseData = movements.map((movement) =>
      this.mapToResponseDto(movement),
    );

    return PaginationHelper.createResponse(responseData, total, page, limit);
  }

  /**
   * Obtener historial de un registro específico
   */
  async getRecordHistory(
    recordId: number,
  ): Promise<MovementHistoryResponseDto[]> {
    const movements = await this.movementHistoryRepository.find({
      where: { record_id: recordId },
      order: { action_date: 'DESC' },
      relations: ['user'],
    });

    return movements.map((movement) => this.mapToResponseDto(movement));
  }

  /**
   * Obtener estadísticas de movimientos
   */
  async getMovementStatistics(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    byAction: Array<{ action: MovementAction; count: number }>;
    byUser: Array<{ username: string; count: number }>;
  }> {
    const total = await this.movementHistoryRepository.count();

    // Movimientos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.movementHistoryRepository.count({
      where: {
        action_date: Between(today, tomorrow),
      },
    });

    // Movimientos de esta semana
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekCount = await this.movementHistoryRepository.count({
      where: {
        action_date: Between(weekStart, new Date()),
      },
    });

    // Estadísticas por acción
    const byActionQuery = await this.movementHistoryRepository
      .createQueryBuilder('movement')
      .select('movement.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('movement.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const byAction = byActionQuery.map((item: any) => ({
      action: item.action as MovementAction,
      count: parseInt(item.count, 10),
    }));

    // Estadísticas por usuario
    const byUserQuery = await this.movementHistoryRepository
      .createQueryBuilder('movement')
      .select('movement.username', 'username')
      .addSelect('COUNT(*)', 'count')
      .where('movement.username IS NOT NULL')
      .groupBy('movement.username')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byUser = byUserQuery.map((item: any) => ({
      username: item.username,
      count: parseInt(item.count, 10),
    }));

    return {
      total,
      today: todayCount,
      thisWeek: thisWeekCount,
      byAction,
      byUser,
    };
  }

  /**
   * Obtener lista única de usernames para filtros
   */
  async getUniqueUsernames(): Promise<Array<{ value: string; label: string }>> {
    const usernamesQuery = await this.movementHistoryRepository
      .createQueryBuilder('movement')
      .select('DISTINCT movement.username', 'username')
      .where('movement.username IS NOT NULL')
      .andWhere('movement.username != :empty', { empty: '' })
      .orderBy('movement.username', 'ASC')
      .getRawMany();

    return usernamesQuery.map((item: any) => ({
      value: item.username,
      label: item.username,
    }));
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(
    movement: RecordMovementHistory,
  ): MovementHistoryResponseDto {
    // Parsear valores JSON
    let previousValues = null;
    let newValues = null;
    let changedFields = null;
    let additionalMetadata = null;

    try {
      if (movement.previous_values) {
        previousValues = JSON.parse(movement.previous_values);
      }
      if (movement.new_values) {
        newValues = JSON.parse(movement.new_values);
      }
      if (movement.changed_fields) {
        changedFields = JSON.parse(movement.changed_fields);
      }
      if (movement.additional_metadata) {
        additionalMetadata = JSON.parse(movement.additional_metadata);
      }
    } catch (error) {
      this.logger.warn(
        `Error parsing JSON for movement ${movement.id}:`,
        error,
      );
    }

    // Formatear fecha
    const formattedDate = movement.action_date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Etiqueta de acción
    const actionLabels: Record<MovementAction, string> = {
      [MovementAction.CREATE]: 'Creación',
      [MovementAction.UPDATE]: 'Actualización',
      [MovementAction.DELETE]: 'Eliminación',
      [MovementAction.RESTORE]: 'Restauración',
      [MovementAction.STATUS_CHANGE]: 'Cambio de Estado',
      [MovementAction.IMAGE_UPLOAD]: 'Subida de Imagen',
      [MovementAction.IMAGE_REPLACE]: 'Reemplazo de Imagen',
      [MovementAction.IMAGE_DELETE]: 'Eliminación de Imagen',
      [MovementAction.LOCATION_CHANGE]: 'Cambio de Ubicación',
      [MovementAction.COMPANY_CHANGE]: 'Cambio de Empresa',
      [MovementAction.MAINTENANCE]: 'Mantenimiento',
    };

    // Nombre de usuario para mostrar
    const userDisplayName = movement.user
      ? `${movement.user.nombre} ${movement.user.apellidos || ''}`.trim()
      : movement.username || 'Usuario Desconocido';

    return {
      id: movement.id,
      record_id: movement.record_id ?? 0,
      record_code: movement.record_code,
      action: movement.action,
      description: movement.description,
      action_date: movement.action_date,
      user_id: movement.user_id,
      username: movement.username,
      previous_values: previousValues,
      new_values: newValues,
      changed_fields: changedFields,
      is_record_active: movement.is_record_active,
      additional_metadata: additionalMetadata,
      ip_address: movement.ip_address,
      user_agent: movement.user_agent,
      formatted_date: formattedDate,
      action_label: actionLabels[movement.action],
      user_display_name: userDisplayName,
    };
  }

  /**
   * Limpiar historial antiguo (para mantenimiento)
   */
  async cleanOldMovements(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.movementHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('action_date < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(
      `Limpieza de historial: ${result.affected || 0} registros eliminados`,
    );

    return result.affected || 0;
  }
}
