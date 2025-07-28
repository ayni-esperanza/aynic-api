import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  FindManyOptions,
  FindOperator,
} from 'typeorm';
import { Record } from './entities/record.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

export interface RecordFilters {
  codigo?: string;
  cliente?: string;
  equipo?: string;
  estado_actual?: string;
  tipo_linea?: string;
  ubicacion?: string;
  seec?: string;
  fecha_vencimiento_desde?: Date;
  fecha_vencimiento_hasta?: Date;
  fecha_instalacion_desde?: Date;
  fecha_instalacion_hasta?: Date;
}

// Tipo para las condiciones de búsqueda que permite operadores de TypeORM
type WhereConditions = {
  [K in keyof Record]?: Record[K] | FindOperator<Record[K]>;
};

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private readonly recordRepository: Repository<Record>,
  ) {}

  async create(createRecordDto: CreateRecordDto): Promise<Record> {
    // Verificar que el código no existe
    const existingRecord = await this.recordRepository.findOne({
      where: { codigo: createRecordDto.codigo },
    });

    if (existingRecord) {
      throw new ConflictException(
        `Ya existe un registro con el código: ${createRecordDto.codigo}`,
      );
    }

    // Validar fechas si se proporcionan
    if (
      createRecordDto.fecha_instalacion &&
      createRecordDto.fecha_vencimiento
    ) {
      const instalacion = new Date(createRecordDto.fecha_instalacion);
      const vencimiento = new Date(createRecordDto.fecha_vencimiento);

      if (vencimiento <= instalacion) {
        throw new BadRequestException(
          'La fecha de vencimiento debe ser posterior a la fecha de instalación',
        );
      }
    }

    // Calcular fecha de vencimiento si se proporcionan años y meses de vida útil
    let fechaVencimiento = createRecordDto.fecha_vencimiento;
    if (
      createRecordDto.fecha_instalacion &&
      (createRecordDto.fv_anios || createRecordDto.fv_meses)
    ) {
      const fechaInstalacion = new Date(createRecordDto.fecha_instalacion);
      const anios = createRecordDto.fv_anios || 0;
      const meses = createRecordDto.fv_meses || 0;

      fechaVencimiento = new Date(fechaInstalacion);
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + anios);
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + meses);
    }

    const record = this.recordRepository.create({
      ...createRecordDto,
      fecha_vencimiento: fechaVencimiento,
      estado_actual: createRecordDto.estado_actual || 'ACTIVO',
    });

    return await this.recordRepository.save(record);
  }

  async findAll(
    filters?: RecordFilters,
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<Record>> {
    // Configurar paginación con valores por defecto usando métodos helper
    const pagination = paginationDto || new PaginationDto();

    const page = pagination.getPage();
    const limit = pagination.getLimit();
    const sortBy = pagination.getSortBy();
    const sortOrder = pagination.getSortOrder();

    const whereConditions: WhereConditions = {};

    if (filters) {
      // Filtros de texto (búsqueda parcial)
      if (filters.codigo) {
        whereConditions.codigo = Like(`%${filters.codigo}%`);
      }
      if (filters.cliente) {
        whereConditions.cliente = Like(`%${filters.cliente}%`);
      }
      if (filters.equipo) {
        whereConditions.equipo = Like(`%${filters.equipo}%`);
      }
      if (filters.ubicacion) {
        whereConditions.ubicacion = Like(`%${filters.ubicacion}%`);
      }

      // Filtros exactos
      if (filters.estado_actual) {
        whereConditions.estado_actual = filters.estado_actual;
      }
      if (filters.tipo_linea) {
        whereConditions.tipo_linea = filters.tipo_linea;
      }
      if (filters.seec) {
        whereConditions.seec = filters.seec;
      }

      // Filtros de rango de fechas
      if (filters.fecha_vencimiento_desde && filters.fecha_vencimiento_hasta) {
        whereConditions.fecha_vencimiento = Between(
          filters.fecha_vencimiento_desde,
          filters.fecha_vencimiento_hasta,
        );
      } else if (filters.fecha_vencimiento_desde) {
        whereConditions.fecha_vencimiento = Between(
          filters.fecha_vencimiento_desde,
          new Date('2099-12-31'),
        );
      } else if (filters.fecha_vencimiento_hasta) {
        whereConditions.fecha_vencimiento = Between(
          new Date('1900-01-01'),
          filters.fecha_vencimiento_hasta,
        );
      }

      if (filters.fecha_instalacion_desde && filters.fecha_instalacion_hasta) {
        whereConditions.fecha_instalacion = Between(
          filters.fecha_instalacion_desde,
          filters.fecha_instalacion_hasta,
        );
      } else if (filters.fecha_instalacion_desde) {
        whereConditions.fecha_instalacion = Between(
          filters.fecha_instalacion_desde,
          new Date('2099-12-31'),
        );
      } else if (filters.fecha_instalacion_hasta) {
        whereConditions.fecha_instalacion = Between(
          new Date('1900-01-01'),
          filters.fecha_instalacion_hasta,
        );
      }
    }

    // Configurar opciones de búsqueda con paginación
    const options: FindManyOptions<Record> = {
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    };

    // Ejecutar búsqueda con conteo total
    const [records, total] = await this.recordRepository.findAndCount(options);

    // Retornar respuesta paginada
    return PaginationHelper.createResponse(records, total, page, limit);
  }

  async findOne(id: number): Promise<Record> {
    const record = await this.recordRepository.findOne({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Registro con ID ${id} no encontrado`);
    }

    return record;
  }

  async findByCode(codigo: string): Promise<Record> {
    const record = await this.recordRepository.findOne({ where: { codigo } });

    if (!record) {
      throw new NotFoundException(
        `Registro con código ${codigo} no encontrado`,
      );
    }

    return record;
  }

  async update(id: number, updateRecordDto: UpdateRecordDto): Promise<Record> {
    const record = await this.findOne(id);

    // Si se está cambiando el código, verificar que no exista
    if (updateRecordDto.codigo && updateRecordDto.codigo !== record.codigo) {
      const existingRecord = await this.recordRepository.findOne({
        where: { codigo: updateRecordDto.codigo },
      });

      if (existingRecord) {
        throw new ConflictException(
          `Ya existe un registro con el código: ${updateRecordDto.codigo}`,
        );
      }
    }

    // Validar fechas si se proporcionan
    const fechaInstalacion =
      updateRecordDto.fecha_instalacion || record.fecha_instalacion;
    const fechaVencimiento =
      updateRecordDto.fecha_vencimiento || record.fecha_vencimiento;

    if (fechaInstalacion && fechaVencimiento) {
      const instalacion = new Date(fechaInstalacion);
      const vencimiento = new Date(fechaVencimiento);

      if (vencimiento <= instalacion) {
        throw new BadRequestException(
          'La fecha de vencimiento debe ser posterior a la fecha de instalación',
        );
      }
    }

    // Recalcular fecha de vencimiento si se actualizan años/meses de vida útil
    let nuevaFechaVencimiento = updateRecordDto.fecha_vencimiento;
    if (
      fechaInstalacion &&
      (updateRecordDto.fv_anios !== undefined ||
        updateRecordDto.fv_meses !== undefined)
    ) {
      const anios = updateRecordDto.fv_anios ?? record.fv_anios ?? 0;
      const meses = updateRecordDto.fv_meses ?? record.fv_meses ?? 0;

      if (anios > 0 || meses > 0) {
        nuevaFechaVencimiento = new Date(fechaInstalacion);
        nuevaFechaVencimiento.setFullYear(
          nuevaFechaVencimiento.getFullYear() + anios,
        );
        nuevaFechaVencimiento.setMonth(
          nuevaFechaVencimiento.getMonth() + meses,
        );
      }
    }

    await this.recordRepository.update(id, {
      ...updateRecordDto,
      fecha_vencimiento: nuevaFechaVencimiento,
    });

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.recordRepository.remove(record);
  }

  // Métodos útiles para reportes y análisis
  async getRecordsByStatus(estado: string): Promise<Record[]> {
    return await this.recordRepository.find({
      where: { estado_actual: estado },
      order: { codigo: 'ASC' },
    });
  }

  async getExpiringRecords(days: number = 30): Promise<Record[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.recordRepository.find({
      where: {
        fecha_vencimiento: Between(new Date(), futureDate),
        estado_actual: 'ACTIVO',
      },
      order: { fecha_vencimiento: 'ASC' },
    });
  }

  async getExpiredRecords(): Promise<Record[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return await this.recordRepository.find({
      where: {
        fecha_vencimiento: Between(new Date('1900-01-01'), today),
        estado_actual: 'ACTIVO',
      },
      order: { fecha_vencimiento: 'ASC' },
    });
  }

  async getRecordStatistics() {
    const total = await this.recordRepository.count();
    const activos = await this.recordRepository.count({
      where: { estado_actual: 'ACTIVO' },
    });
    const vencidos = (await this.getExpiredRecords()).length;
    const porVencer = (await this.getExpiringRecords()).length;

    return {
      total,
      activos,
      vencidos,
      por_vencer: porVencer,
      inactivos: total - activos,
    };
  }
}
