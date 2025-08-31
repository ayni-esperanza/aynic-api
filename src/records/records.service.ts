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
  ILike,
  Between,
  In,
  FindManyOptions,
  FindOptionsWhere,
} from 'typeorm';
import {
  MovementTrackingService,
  TrackingContext,
} from '../record-movement-history/movement-tracking.service';
import { EmpresaPermissionsService } from './services/empresa-permissions.service';
import { Record } from './entities/record.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { GetRecordsQueryDto } from './dto/get-records-query.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private readonly recordRepository: Repository<Record>,
    private readonly movementTrackingService: MovementTrackingService,
    private readonly empresaPermissionsService: EmpresaPermissionsService,
  ) {}

  async create(
    createRecordDto: CreateRecordDto,
    trackingContext?: TrackingContext,
  ): Promise<Record> {
    const existingRecord = await this.recordRepository.findOne({
      where: { codigo: createRecordDto.codigo },
    });
    if (existingRecord) {
      throw new ConflictException(
        `Ya existe un registro con el código: ${createRecordDto.codigo}`,
      );
    }

    // Verificar unicidad del código de placa
    if (createRecordDto.codigo_placa) {
      const existingPlateCode = await this.recordRepository.findOne({
        where: { codigo_placa: createRecordDto.codigo_placa },
      });
      if (existingPlateCode) {
        throw new ConflictException(
          `Ya existe un registro con el código de placa: ${createRecordDto.codigo_placa}`,
        );
      }
    }

    // Validar fechas si ambas existen
    if (createRecordDto.fecha_instalacion && createRecordDto.fecha_caducidad) {
      const instalacion = new Date(String(createRecordDto.fecha_instalacion));
      const caducidad = new Date(String(createRecordDto.fecha_caducidad));
      if (caducidad <= instalacion) {
        throw new BadRequestException(
          'La fecha de caducidad debe ser posterior a la fecha de instalación',
        );
      }
    }

    // Calcular caducidad si se proporcionan años/meses de vida útil
    let fechaCaducidad = createRecordDto.fecha_caducidad
      ? new Date(String(createRecordDto.fecha_caducidad))
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

      fechaCaducidad = new Date(fechaInstalacion);
      fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + anios);
      fechaCaducidad.setMonth(fechaCaducidad.getMonth() + meses);
    }

    const record = this.recordRepository.create({
      ...createRecordDto,
      fecha_caducidad: fechaCaducidad,
      estado_actual: createRecordDto.estado_actual || 'ACTIVO',
    });

    const savedRecord = await this.recordRepository.save(record);

    if (trackingContext) {
      await this.movementTrackingService.trackRecordCreation(
        savedRecord,
        trackingContext,
      );
    }

    return savedRecord;
  }

  async findAll(query: GetRecordsQueryDto): Promise<PaginatedResponse<Record>> {
    const page = query.getPage();
    const limit = query.getLimit();
    const sortBy = query.getSortBy();
    const sortOrder = query.getSortOrder();

    const whereConditions: FindOptionsWhere<Record> = {};

    if (query.codigo) whereConditions.codigo = ILike(`%${query.codigo}%`);
    if (query.cliente) whereConditions.cliente = Like(`%${query.cliente}%`);
    if (query.equipo) whereConditions.equipo = ILike(`%${query.equipo}%`);
    if (query.ubicacion)
      whereConditions.ubicacion = ILike(`%${query.ubicacion}%`);
    if (query.anclaje_equipos)
      whereConditions.anclaje_equipos = ILike(`%${query.anclaje_equipos}%`);

    // Código de placa
    if (query.codigo_placa)
      whereConditions.codigo_placa = ILike(`%${query.codigo_placa}%`);

    if (query.estado_actual)
      whereConditions.estado_actual = query.estado_actual;
    if (query.tipo_linea) whereConditions.tipo_linea = query.tipo_linea;
    if (query.seccion) whereConditions.seccion = query.seccion;
    if (query.area) whereConditions.area = query.area;
    if (query.planta) whereConditions.planta = query.planta;

    // Rango de fechas de caducidad
    if (query.fecha_caducidad_desde && query.fecha_caducidad_hasta) {
      whereConditions.fecha_caducidad = Between(
        new Date(String(query.fecha_caducidad_desde)),
        new Date(String(query.fecha_caducidad_hasta)),
      );
    } else if (query.fecha_caducidad_desde) {
      whereConditions.fecha_caducidad = Between(
        new Date(String(query.fecha_caducidad_desde)),
        new Date('2099-12-31'),
      );
    } else if (query.fecha_caducidad_hasta) {
      whereConditions.fecha_caducidad = Between(
        new Date('1900-01-01'),
        new Date(String(query.fecha_caducidad_hasta)),
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

  async findAllWithEmpresaFilter(
    query: GetRecordsQueryDto,
    userEmpresa: { empresa: string; isAyniUser: boolean },
  ): Promise<PaginatedResponse<Record>> {
    const page = query.getPage();
    const limit = query.getLimit();
    const sortBy = query.getSortBy();
    const sortOrder = query.getSortOrder();

    const whereConditions: FindOptionsWhere<Record> = {};

    // USAR EL SERVICIO DE PERMISOS
    const filterConditions =
      this.empresaPermissionsService.getRecordFilterConditions(
        userEmpresa.empresa,
      );

    // Aplicar filtro de empresa si es necesario
    if (filterConditions.shouldFilter && filterConditions.allowedClientes) {
      whereConditions.cliente = In(filterConditions.allowedClientes);
    }

    // Resto de filtros existentes con validación de permisos
    if (query.codigo) whereConditions.codigo = ILike(`%${query.codigo}%`);

    if (query.cliente) {
      if (filterConditions.shouldFilter) {
        // Usuario no-Ayni: verificar que busque dentro de su empresa
        const canSearchClient =
          this.empresaPermissionsService.canViewCompanyRecords(
            userEmpresa.empresa,
            query.cliente,
          );

        if (canSearchClient) {
          whereConditions.cliente = ILike(`%${query.cliente}%`);
        } else {
          // Si busca una empresa no permitida, no mostrar resultados
          whereConditions.cliente = 'EMPRESA_NO_PERMITIDA';
        }
      } else {
        // Usuario Ayni: puede buscar cualquier cliente
        whereConditions.cliente = Like(`%${query.cliente}%`);
      }
    }

    if (query.equipo) whereConditions.equipo = ILike(`%${query.equipo}%`);
    if (query.ubicacion)
      whereConditions.ubicacion = ILike(`%${query.ubicacion}%`);
    if (query.anclaje_equipos)
      whereConditions.anclaje_equipos = ILike(`%${query.anclaje_equipos}%`);
    if (query.codigo_placa)
      whereConditions.codigo_placa = ILike(`%${query.codigo_placa}%`);
    if (query.estado_actual)
      whereConditions.estado_actual = query.estado_actual;
    if (query.tipo_linea) whereConditions.tipo_linea = query.tipo_linea;
    if (query.seccion) whereConditions.seccion = query.seccion;
    if (query.area) whereConditions.area = query.area;
    if (query.planta) whereConditions.planta = query.planta;

    // Filtros de fechas
    if (query.fecha_caducidad_desde && query.fecha_caducidad_hasta) {
      whereConditions.fecha_caducidad = Between(
        new Date(String(query.fecha_caducidad_desde)),
        new Date(String(query.fecha_caducidad_hasta)),
      );
    } else if (query.fecha_caducidad_desde) {
      whereConditions.fecha_caducidad = Between(
        new Date(String(query.fecha_caducidad_desde)),
        new Date('2099-12-31'),
      );
    } else if (query.fecha_caducidad_hasta) {
      whereConditions.fecha_caducidad = Between(
        new Date('1900-01-01'),
        new Date(String(query.fecha_caducidad_hasta)),
      );
    }

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

  /**
   * Validar acceso a un registro específico
   */
  async validateRecordAccess(
    recordId: number,
    userEmpresa: string,
  ): Promise<boolean> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      return false;
    }

    return this.empresaPermissionsService.canAccessRecord(
      userEmpresa,
      record.cliente,
    );
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

  // Buscar por código de placa
  async findByPlateCode(codigoPlaca: string): Promise<Record> {
    const record = await this.recordRepository.findOne({
      where: { codigo_placa: codigoPlaca },
    });
    if (!record) {
      throw new NotFoundException(
        `Registro con código de placa ${codigoPlaca} no encontrado`,
      );
    }
    return record;
  }

  async update(
    id: number,
    updateRecordDto: UpdateRecordDto,
    trackingContext?: TrackingContext,
  ): Promise<Record> {
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

    // Verificar unicidad del código de placa al actualizar
    if (
      updateRecordDto.codigo_placa &&
      updateRecordDto.codigo_placa !== record.codigo_placa
    ) {
      const existingPlateCode = await this.recordRepository.findOne({
        where: { codigo_placa: updateRecordDto.codigo_placa },
      });
      if (existingPlateCode) {
        throw new ConflictException(
          `Ya existe un registro con el código de placa: ${updateRecordDto.codigo_placa}`,
        );
      }
    }

    const fechaInstalacion =
      updateRecordDto.fecha_instalacion || record.fecha_instalacion;
    const fechaCaducidad =
      updateRecordDto.fecha_caducidad || record.fecha_caducidad;

    if (fechaInstalacion && fechaCaducidad) {
      const instalacion = new Date(String(fechaInstalacion));
      const caducidad = new Date(String(fechaCaducidad));
      if (caducidad <= instalacion) {
        throw new BadRequestException(
          'La fecha de caducidad debe ser posterior a la fecha de instalación',
        );
      }
    }

    let nuevaFechaCaducidad = updateRecordDto.fecha_caducidad
      ? new Date(String(updateRecordDto.fecha_caducidad))
      : record.fecha_caducidad;

    if (
      fechaInstalacion &&
      (updateRecordDto.fv_anios !== undefined ||
        updateRecordDto.fv_meses !== undefined)
    ) {
      const anios = updateRecordDto.fv_anios ?? record.fv_anios ?? 0;
      const meses = updateRecordDto.fv_meses ?? record.fv_meses ?? 0;

      if (anios > 0 || meses > 0) {
        nuevaFechaCaducidad = new Date(fechaInstalacion);
        nuevaFechaCaducidad.setFullYear(
          nuevaFechaCaducidad.getFullYear() + anios,
        );
        nuevaFechaCaducidad.setMonth(nuevaFechaCaducidad.getMonth() + meses);
      }
    }

    const previousValues = {
      codigo: record.codigo,
      cliente: record.cliente,
      equipo: record.equipo,
      anclaje_equipos: record.anclaje_equipos,
      codigo_placa: record.codigo_placa,
      fv_anios: record.fv_anios,
      fv_meses: record.fv_meses,
      fecha_instalacion: record.fecha_instalacion,
      longitud: record.longitud,
      observaciones: record.observaciones,
      seccion: record.seccion,
      area: record.area,
      planta: record.planta,
      tipo_linea: record.tipo_linea,
      ubicacion: record.ubicacion,
      fecha_caducidad: record.fecha_caducidad,
      estado_actual: record.estado_actual,
    };

    await this.recordRepository.update(id, {
      ...updateRecordDto,
      fecha_caducidad: nuevaFechaCaducidad,
    });

    const updatedRecord = await this.findOne(id);

    // Registrar en historial de movimientos
    if (trackingContext) {
      const newValues = {
        codigo: updatedRecord.codigo,
        cliente: updatedRecord.cliente,
        equipo: updatedRecord.equipo,
        anclaje_equipos: updatedRecord.anclaje_equipos,
        codigo_placa: updatedRecord.codigo_placa,
        fv_anios: updatedRecord.fv_anios,
        fv_meses: updatedRecord.fv_meses,
        fecha_instalacion: updatedRecord.fecha_instalacion,
        longitud: updatedRecord.longitud,
        observaciones: updatedRecord.observaciones,
        seccion: updatedRecord.seccion,
        area: updatedRecord.area,
        planta: updatedRecord.planta,
        tipo_linea: updatedRecord.tipo_linea,
        ubicacion: updatedRecord.ubicacion,
        fecha_caducidad: updatedRecord.fecha_caducidad,
        estado_actual: updatedRecord.estado_actual,
      };

      await this.movementTrackingService.trackRecordUpdate(
        id,
        record.codigo,
        previousValues,
        newValues,
        trackingContext,
      );
    }

    return updatedRecord;
  }

  async remove(id: number, trackingContext?: TrackingContext): Promise<void> {
    const record = await this.findOne(id);

    // Registrar en historial antes de eliminar
    if (trackingContext) {
      await this.movementTrackingService.trackRecordDeletion(
        record,
        trackingContext,
      );
    }

    await this.recordRepository.remove(record);
  }

  /**
   * Verificar si una línea de vida tiene incidentes registrados
   */
  async hasIncidents(recordId: number): Promise<{
    hasIncidents: boolean;
    totalIncidents: number;
    lastIncidentDate: Date | null;
  }> {
    const query = `
    SELECT 
      COUNT(*) as total_incidents,
      MAX(fecha_accidente) as last_incident_date
    FROM accidentes 
    WHERE linea_vida_id = $1
  `;

    const result = await this.recordRepository.query(query, [recordId]);
    const totalIncidents = parseInt(result[0]?.total_incidents || '0', 10);
    const lastIncidentDate = result[0]?.last_incident_date || null;

    return {
      hasIncidents: totalIncidents > 0,
      totalIncidents,
      lastIncidentDate: lastIncidentDate ? new Date(lastIncidentDate) : null,
    };
  }

  /**
   * Obtener registros con información de incidentes
   */
  async findAllWithIncidents(
    query: GetRecordsQueryDto,
  ): Promise<PaginatedResponse<Record & { incidentInfo?: any }>> {
    const records = await this.findAll(query);

    // Agregar información de incidentes a cada registro
    const recordsWithIncidents = await Promise.all(
      records.data.map(async (record) => {
        const incidentInfo = await this.hasIncidents(record.id);
        return {
          ...record,
          incidentInfo,
        };
      }),
    );

    return {
      ...records,
      data: recordsWithIncidents,
    };
  }

  /**
   * Buscar líneas de vida por término de búsqueda (sin paginación)
   * Para uso en selects/autocomplete
   */
  async searchLineasVida(searchTerm?: string): Promise<
    Array<{
      id: number;
      codigo: string;
      cliente: string;
      ubicacion: string;
    }>
  > {
    let whereConditions: FindOptionsWhere<Record> | FindOptionsWhere<Record>[] = {};

    if (searchTerm) {
      // Buscar en código, cliente o ubicación
      whereConditions = [
        { codigo: ILike(`%${searchTerm}%`) },
        { cliente: ILike(`%${searchTerm}%`) },
        { ubicacion: ILike(`%${searchTerm}%`) },
      ];
    }

    const records = await this.recordRepository.find({
      where: whereConditions,
      order: { codigo: 'ASC' },
      take: 500, // Límite razonable para evitar sobrecarga
      select: ['id', 'codigo', 'cliente', 'ubicacion'], // Solo campos necesarios
    });

    return records.map((record) => ({
      id: record.id,
      codigo: record.codigo,
      cliente: record.cliente || '',
      ubicacion: record.ubicacion || '',
    }));
  }

  /**
   * Verificar si un usuario puede eliminar un registro directamente (sin autorización)
   * Regla: Solo si el registro fue creado hace 3 días o menos por el mismo usuario
   */
  async canUserDeleteDirectly(
    recordId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      // Buscar directamente en el historial de movimientos con query SQL
      const creationEntry = await this.recordRepository.query(
        `
      SELECT action_date, user_id 
      FROM record_movement_history 
      WHERE record_id = $1 AND action = 'CREATE' 
      ORDER BY action_date ASC 
      LIMIT 1
    `,
        [recordId],
      );

      if (!creationEntry || creationEntry.length === 0) {
        // Si no hay historial de creación, asumir que es antiguo y requerir autorización
        return false;
      }

      const creation = creationEntry[0];

      // Verificar que fue creado por el mismo usuario
      if (creation.user_id !== userId) {
        // Solo puede eliminar sus propios registros sin autorización
        return false;
      }

      // Calcular diferencia en días
      const now = new Date();
      const createdAt = new Date(creation.action_date);
      const diffInMs = now.getTime() - createdAt.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      // Permitir eliminación directa si han pasado 3 días o menos
      return diffInDays <= 3;
    } catch (error) {
      // En caso de error, ser conservador y requerir autorización
      return false;
    }
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
        fecha_caducidad: Between(new Date(), futureDate),
        estado_actual: 'ACTIVO',
      },
      order: { fecha_caducidad: 'ASC' },
    });
  }

  async getExpiredRecords(): Promise<Record[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return await this.recordRepository.find({
      where: {
        fecha_caducidad: Between(new Date('1900-01-01'), today),
        estado_actual: 'ACTIVO',
      },
      order: { fecha_caducidad: 'ASC' },
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
