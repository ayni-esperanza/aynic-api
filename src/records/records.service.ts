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
import { GetRecordsQueryDto } from './dto/get-records-query.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

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
    const existingRecord = await this.recordRepository.findOne({
      where: { codigo: createRecordDto.codigo },
    });
    if (existingRecord) {
      throw new ConflictException(
        `Ya existe un registro con el código: ${createRecordDto.codigo}`,
      );
    }

    // Validar fechas si ambas existen
    if (
      createRecordDto.fecha_instalacion &&
      createRecordDto.fecha_vencimiento
    ) {
      const instalacion = new Date(String(createRecordDto.fecha_instalacion));
      const vencimiento = new Date(String(createRecordDto.fecha_vencimiento));
      if (vencimiento <= instalacion) {
        throw new BadRequestException(
          'La fecha de vencimiento debe ser posterior a la fecha de instalación',
        );
      }
    }

    // Calcular vencimiento si se proporcionan años/meses de vida útil
    let fechaVencimiento = createRecordDto.fecha_vencimiento
      ? new Date(String(createRecordDto.fecha_vencimiento))
      : undefined;

    if (
      createRecordDto.fecha_instalacion &&
      (createRecordDto.fv_anios || createRecordDto.fv_meses)
    ) {
      const fechaInstalacion = new Date(
        String(createRecordDto.fecha_instalacion),
      );
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

  async findAll(query: GetRecordsQueryDto): Promise<PaginatedResponse<Record>> {
    const page = query.getPage();
    const limit = query.getLimit();
    const sortBy = query.getSortBy();
    const sortOrder = query.getSortOrder();

    const whereConditions: WhereConditions = {};

    if (query.codigo) whereConditions.codigo = Like(`%${query.codigo}%`);
    if (query.cliente) whereConditions.cliente = Like(`%${query.cliente}%`);
    if (query.equipo) whereConditions.equipo = Like(`%${query.equipo}%`);
    if (query.ubicacion)
      whereConditions.ubicacion = Like(`%${query.ubicacion}%`);
    if (query.estado_actual)
      whereConditions.estado_actual = query.estado_actual;
    if (query.tipo_linea) whereConditions.tipo_linea = query.tipo_linea;
    if (query.seec) whereConditions.seec = query.seec;

    // Rango de fechas de vencimiento
    if (query.fecha_vencimiento_desde && query.fecha_vencimiento_hasta) {
      whereConditions.fecha_vencimiento = Between(
        new Date(String(query.fecha_vencimiento_desde)),
        new Date(String(query.fecha_vencimiento_hasta)),
      );
    } else if (query.fecha_vencimiento_desde) {
      whereConditions.fecha_vencimiento = Between(
        new Date(String(query.fecha_vencimiento_desde)),
        new Date('2099-12-31'),
      );
    } else if (query.fecha_vencimiento_hasta) {
      whereConditions.fecha_vencimiento = Between(
        new Date('1900-01-01'),
        new Date(String(query.fecha_vencimiento_hasta)),
      );
    }

    // Rango de fechas de instalación
    if (query.fecha_instalacion_desde && query.fecha_instalacion_hasta) {
      whereConditions.fecha_instalacion = Between(
        new Date(String(query.fecha_instalacion_desde)),
        new Date(String(query.fecha_instalacion_hasta)),
      );
    } else if (query.fecha_instalacion_desde) {
      whereConditions.fecha_instalacion = Between(
        new Date(String(query.fecha_instalacion_desde)),
        new Date('2099-12-31'),
      );
    } else if (query.fecha_instalacion_hasta) {
      whereConditions.fecha_instalacion = Between(
        new Date('1900-01-01'),
        new Date(String(query.fecha_instalacion_hasta)),
      );
    }

    const options: FindManyOptions<Record> = {
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    };

    const [records, total] = await this.recordRepository.findAndCount(options);

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
    const fechaInstalacion =
      updateRecordDto.fecha_instalacion || record.fecha_instalacion;
    const fechaVencimiento =
      updateRecordDto.fecha_vencimiento || record.fecha_vencimiento;

    if (fechaInstalacion && fechaVencimiento) {
      const instalacion = new Date(String(fechaInstalacion));
      const vencimiento = new Date(String(fechaVencimiento));
      if (vencimiento <= instalacion) {
        throw new BadRequestException(
          'La fecha de vencimiento debe ser posterior a la fecha de instalación',
        );
      }
    }

    let nuevaFechaVencimiento = updateRecordDto.fecha_vencimiento
      ? new Date(String(updateRecordDto.fecha_vencimiento))
      : record.fecha_vencimiento;

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

    const porVencer = await this.recordRepository.count({
      where: { estado_actual: 'POR_VENCER' }, 
    });

    const vencidos = await this.recordRepository.count({
      where: { estado_actual: 'VENCIDO' },
    });

    const inactivos = await this.recordRepository.count({
      where: { estado_actual: 'INACTIVO' },
    });

    const mantenimiento = await this.recordRepository.count({
      where: { estado_actual: 'MANTENIMIENTO' },
    });

    return {
      total,
      activos,
      vencidos,
      por_vencer: porVencer,
      inactivos,
      mantenimiento,
    };
  }
}
