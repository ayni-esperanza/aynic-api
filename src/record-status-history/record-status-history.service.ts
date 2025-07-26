import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, FindOperator } from 'typeorm';
import { RecordStatusHistory } from './entities/record-status-history.entity';
import { CreateRecordStatusHistoryDto } from './dto/create-record-status-history.dto';
import { UpdateRecordStatusHistoryDto } from './dto/update-record-status-history.dto';

export interface StatusHistoryFilters {
  registro_id?: number;
  estado?: string;
  fecha_cambio_desde?: Date;
  fecha_cambio_hasta?: Date;
  observacion?: string;
}

type WhereConditions = {
  [K in keyof RecordStatusHistory]?:
    | RecordStatusHistory[K]
    | FindOperator<RecordStatusHistory[K]>;
};

interface StatusStatResult {
  estado: string;
  total: string;
}

interface PeriodStatResult {
  fecha: string;
  estado: string;
  total: string;
}

@Injectable()
export class RecordStatusHistoryService {
  constructor(
    @InjectRepository(RecordStatusHistory)
    private readonly statusHistoryRepository: Repository<RecordStatusHistory>,
  ) {}

  async create(
    createRecordStatusHistoryDto: CreateRecordStatusHistoryDto,
  ): Promise<RecordStatusHistory> {
    const statusHistory = this.statusHistoryRepository.create({
      ...createRecordStatusHistoryDto,
      fecha_cambio: createRecordStatusHistoryDto.fecha_cambio || new Date(),
    });

    return await this.statusHistoryRepository.save(statusHistory);
  }

  async findAll(
    filters?: StatusHistoryFilters,
  ): Promise<RecordStatusHistory[]> {
    const whereConditions: WhereConditions = {};

    if (filters) {
      if (filters.registro_id) {
        whereConditions.registro_id = filters.registro_id;
      }
      if (filters.estado) {
        whereConditions.estado = filters.estado;
      }
      if (filters.observacion) {
        whereConditions.observacion = filters.observacion;
      }

      if (filters.fecha_cambio_desde && filters.fecha_cambio_hasta) {
        whereConditions.fecha_cambio = Between(
          filters.fecha_cambio_desde,
          filters.fecha_cambio_hasta,
        );
      } else if (filters.fecha_cambio_desde) {
        whereConditions.fecha_cambio = Between(
          filters.fecha_cambio_desde,
          new Date('2099-12-31'),
        );
      } else if (filters.fecha_cambio_hasta) {
        whereConditions.fecha_cambio = Between(
          new Date('1900-01-01'),
          filters.fecha_cambio_hasta,
        );
      }
    }

    const options: FindManyOptions<RecordStatusHistory> = {
      where: whereConditions,
      order: { fecha_cambio: 'DESC' },
      relations: ['record'],
    };

    return await this.statusHistoryRepository.find(options);
  }

  async findOne(id: number): Promise<RecordStatusHistory> {
    const statusHistory = await this.statusHistoryRepository.findOne({
      where: { id },
      relations: ['record'],
    });

    if (!statusHistory) {
      throw new NotFoundException(
        `Historial de estado con ID ${id} no encontrado`,
      );
    }

    return statusHistory;
  }

  async update(
    id: number,
    updateRecordStatusHistoryDto: UpdateRecordStatusHistoryDto,
  ): Promise<RecordStatusHistory> {
    const statusHistory = await this.findOne(id);

    if (
      updateRecordStatusHistoryDto.registro_id &&
      updateRecordStatusHistoryDto.registro_id !== statusHistory.registro_id
    ) {
      const existingRecord = await this.statusHistoryRepository.findOne({
        where: { id: updateRecordStatusHistoryDto.registro_id },
      });
      if (!existingRecord) {
        throw new NotFoundException(
          `Registro con ID ${updateRecordStatusHistoryDto.registro_id} no encontrado`,
        );
      }
    }

    await this.statusHistoryRepository.update(id, updateRecordStatusHistoryDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const statusHistory = await this.findOne(id);
    await this.statusHistoryRepository.remove(statusHistory);
  }

  async getHistoryByRecordId(
    registroId: number,
  ): Promise<RecordStatusHistory[]> {
    return await this.statusHistoryRepository.find({
      where: { registro_id: registroId },
      order: { fecha_cambio: 'DESC' },
      relations: ['record'],
    });
  }

  async getLatestStatusByRecordId(
    registroId: number,
  ): Promise<RecordStatusHistory | null> {
    return await this.statusHistoryRepository.findOne({
      where: { registro_id: registroId },
      order: { fecha_cambio: 'DESC' },
      relations: ['record'],
    });
  }

  async getHistoryByState(estado: string): Promise<RecordStatusHistory[]> {
    return await this.statusHistoryRepository.find({
      where: { estado },
      order: { fecha_cambio: 'DESC' },
      relations: ['record'],
    });
  }

  async getHistoryInDateRange(
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<RecordStatusHistory[]> {
    return await this.statusHistoryRepository.find({
      where: {
        fecha_cambio: Between(fechaInicio, fechaFin),
      },
      order: { fecha_cambio: 'DESC' },
      relations: ['record'],
    });
  }

  async addStatusChange(
    registroId: number,
    nuevoEstado: string,
    observacion?: string,
  ): Promise<RecordStatusHistory> {
    const createDto: CreateRecordStatusHistoryDto = {
      registro_id: registroId,
      estado: nuevoEstado,
      observacion,
      fecha_cambio: new Date(),
    };

    return await this.create(createDto);
  }

  async getStatusStatistics(): Promise<
    Array<{ estado: string; total: number }>
  > {
    const query = this.statusHistoryRepository
      .createQueryBuilder('history')
      .select('history.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('history.estado')
      .orderBy('total', 'DESC');

    const result = await query.getRawMany<StatusStatResult>();

    return result.map((item) => ({
      estado: item.estado,
      total: parseInt(item.total, 10),
    }));
  }

  async getRecentActivity(limit: number = 20): Promise<RecordStatusHistory[]> {
    return await this.statusHistoryRepository.find({
      order: { fecha_cambio: 'DESC' },
      take: limit,
      relations: ['record'],
    });
  }

  async getStatusChangesByPeriod(
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<Array<{ fecha: string; estado: string; total: number }>> {
    const query = this.statusHistoryRepository
      .createQueryBuilder('history')
      .select('DATE(history.fecha_cambio)', 'fecha')
      .addSelect('history.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .where('history.fecha_cambio BETWEEN :inicio AND :fin', {
        inicio: fechaInicio,
        fin: fechaFin,
      })
      .groupBy('DATE(history.fecha_cambio), history.estado')
      .orderBy('fecha', 'DESC')
      .addOrderBy('total', 'DESC');

    const result = await query.getRawMany<PeriodStatResult>();

    return result.map((item) => ({
      fecha: item.fecha,
      estado: item.estado,
      total: parseInt(item.total, 10),
    }));
  }

  // Método para verificar si un registro tiene historial
  async hasHistory(registroId: number): Promise<boolean> {
    const count = await this.statusHistoryRepository.count({
      where: { registro_id: registroId },
    });
    return count > 0;
  }

  // Método para limpiar historial antiguo (útil para mantenimiento)
  async cleanOldHistory(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.statusHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('fecha_cambio < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
