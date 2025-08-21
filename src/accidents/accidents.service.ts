import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, ILike } from 'typeorm';
import {
  Accident,
  EstadoAccidente,
  SeveridadAccidente,
} from './entities/accident.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import {
  CreateAccidentDto,
  UpdateAccidentDto,
  AccidentFiltersDto,
  AccidentResponseDto,
} from './dto/accident.dto';
import {
  PaginatedResponse,
  PaginationHelper,
} from '../common/interfaces/paginated-response.interface';

@Injectable()
export class AccidentsService {
  private readonly logger = new Logger(AccidentsService.name);

  constructor(
    @InjectRepository(Accident)
    private readonly accidentRepository: Repository<Accident>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  /**
   * Crear un nuevo reporte de accidente
   */
  async create(
    createAccidentDto: CreateAccidentDto,
    userId?: number,
  ): Promise<AccidentResponseDto> {
    // Verificar que la línea de vida existe
    const lineaVida = await this.recordRepository.findOne({
      where: { id: createAccidentDto.linea_vida_id },
    });

    if (!lineaVida) {
      throw new NotFoundException(
        `Línea de vida con ID ${createAccidentDto.linea_vida_id} no encontrada`,
      );
    }

    // Validar que la fecha no sea futura
    const fechaAccidente = new Date(createAccidentDto.fecha_accidente);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999); // Final del día

    if (fechaAccidente > hoy) {
      throw new BadRequestException(
        'La fecha del accidente no puede ser futura',
      );
    }

    // Crear el accidente
    const accident = this.accidentRepository.create({
      ...createAccidentDto,
      fecha_accidente: fechaAccidente,
      evidencias_urls: createAccidentDto.evidencias_urls
        ? JSON.stringify(createAccidentDto.evidencias_urls)
        : null,
      reportado_por: userId,
      estado: EstadoAccidente.REPORTADO,
      severidad: createAccidentDto.severidad || SeveridadAccidente.LEVE,
    });

    const savedAccident = await this.accidentRepository.save(accident);

    // Marcar la línea de vida como "con incidente"
    await this.markLineWithIncident(createAccidentDto.linea_vida_id);

    this.logger.log(
      `Accidente registrado: ID ${savedAccident.id} para línea ${lineaVida.codigo}`,
    );

    return this.mapToResponseDto(savedAccident);
  }

  /**
   * Obtener todos los accidentes con filtros
   */
  async findAll(
    filters: AccidentFiltersDto,
  ): Promise<PaginatedResponse<AccidentResponseDto>> {
    const page = filters.getPage();
    const limit = filters.getLimit();
    const sortBy = filters.getSortBy() || 'fecha_creacion';
    const sortOrder = filters.getSortOrder() || 'DESC';

    // Construir condiciones WHERE
    const whereConditions: any = {};

    if (filters.linea_vida_id) {
      whereConditions.linea_vida_id = filters.linea_vida_id;
    }

    if (filters.estado) {
      whereConditions.estado = filters.estado;
    }

    if (filters.severidad) {
      whereConditions.severidad = filters.severidad;
    }

    if (filters.search) {
      whereConditions.descripcion_incidente = ILike(`%${filters.search}%`);
    }

    // Filtros de fecha
    if (filters.fecha_desde && filters.fecha_hasta) {
      whereConditions.fecha_accidente = Between(
        new Date(filters.fecha_desde),
        new Date(filters.fecha_hasta),
      );
    } else if (filters.fecha_desde) {
      whereConditions.fecha_accidente = Between(
        new Date(filters.fecha_desde),
        new Date('2099-12-31'),
      );
    } else if (filters.fecha_hasta) {
      whereConditions.fecha_accidente = Between(
        new Date('1900-01-01'),
        new Date(filters.fecha_hasta),
      );
    }

    const options: FindManyOptions<Accident> = {
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['lineaVida', 'usuario'],
    };

    const [accidents, total] =
      await this.accidentRepository.findAndCount(options);

    const responseData = accidents.map((accident) =>
      this.mapToResponseDto(accident),
    );

    return PaginationHelper.createResponse(responseData, total, page, limit);
  }

  /**
   * Obtener un accidente por ID
   */
  async findOne(id: number): Promise<AccidentResponseDto> {
    const accident = await this.accidentRepository.findOne({
      where: { id },
      relations: ['lineaVida', 'usuario'],
    });

    if (!accident) {
      throw new NotFoundException(`Accidente con ID ${id} no encontrado`);
    }

    return this.mapToResponseDto(accident);
  }

  /**
   * Actualizar un accidente
   */
  async update(
    id: number,
    updateAccidentDto: UpdateAccidentDto,
  ): Promise<AccidentResponseDto> {
    const accident = await this.accidentRepository.findOne({
      where: { id },
      relations: ['lineaVida'],
    });

    if (!accident) {
      throw new NotFoundException(`Accidente con ID ${id} no encontrado`);
    }

    // Si se actualiza la línea de vida, verificar que existe
    if (updateAccidentDto.linea_vida_id) {
      const lineaVida = await this.recordRepository.findOne({
        where: { id: updateAccidentDto.linea_vida_id },
      });

      if (!lineaVida) {
        throw new NotFoundException(
          `Línea de vida con ID ${updateAccidentDto.linea_vida_id} no encontrada`,
        );
      }
    }

    // Validar fecha si se actualiza
    if (updateAccidentDto.fecha_accidente) {
      const fechaAccidente = new Date(updateAccidentDto.fecha_accidente);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);

      if (fechaAccidente > hoy) {
        throw new BadRequestException(
          'La fecha del accidente no puede ser futura',
        );
      }
    }

    // Preparar datos de actualización
    const updateData: any = { ...updateAccidentDto };

    if (updateAccidentDto.evidencias_urls) {
      updateData.evidencias_urls = JSON.stringify(
        updateAccidentDto.evidencias_urls,
      );
    }

    if (updateAccidentDto.fecha_accidente) {
      updateData.fecha_accidente = new Date(updateAccidentDto.fecha_accidente);
    }

    await this.accidentRepository.update(id, updateData);

    this.logger.log(`Accidente actualizado: ID ${id}`);

    return this.findOne(id);
  }

  /**
   * Eliminar un accidente
   */
  async remove(id: number): Promise<void> {
    const accident = await this.findOne(id);
    await this.accidentRepository.delete(id);

    this.logger.log(`Accidente eliminado: ID ${id}`);
  }

  /**
   * Obtener accidentes de una línea de vida específica
   */
  async getAccidentsByLineaVida(
    lineaVidaId: number,
  ): Promise<AccidentResponseDto[]> {
    const accidents = await this.accidentRepository.find({
      where: { linea_vida_id: lineaVidaId },
      order: { fecha_accidente: 'DESC' },
      relations: ['usuario'],
    });

    return accidents.map((accident) => this.mapToResponseDto(accident));
  }

  /**
   * Obtener estadísticas de accidentes
   */
  async getAccidentStatistics(): Promise<{
    total: number;
    porEstado: Array<{ estado: EstadoAccidente; count: number }>;
    porSeveridad: Array<{ severidad: SeveridadAccidente; count: number }>;
    ultimoMes: number;
    lineasConIncidentes: number;
  }> {
    const total = await this.accidentRepository.count();

    // Estadísticas por estado
    const porEstadoQuery = await this.accidentRepository
      .createQueryBuilder('accident')
      .select('accident.estado', 'estado')
      .addSelect('COUNT(*)', 'count')
      .groupBy('accident.estado')
      .getRawMany();

    const porEstado = porEstadoQuery.map((item: any) => ({
      estado: item.estado as EstadoAccidente,
      count: parseInt(item.count, 10),
    }));

    // Estadísticas por severidad
    const porSeveridadQuery = await this.accidentRepository
      .createQueryBuilder('accident')
      .select('accident.severidad', 'severidad')
      .addSelect('COUNT(*)', 'count')
      .groupBy('accident.severidad')
      .getRawMany();

    const porSeveridad = porSeveridadQuery.map((item: any) => ({
      severidad: item.severidad as SeveridadAccidente,
      count: parseInt(item.count, 10),
    }));

    // Accidentes del último mes
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);

    const ultimoMes = await this.accidentRepository.count({
      where: {
        fecha_accidente: Between(unMesAtras, new Date()),
      },
    });

    // Líneas de vida con incidentes
    const lineasConIncidentes = await this.accidentRepository
      .createQueryBuilder('accident')
      .select('COUNT(DISTINCT accident.linea_vida_id)', 'count')
      .getRawOne();

    return {
      total,
      porEstado,
      porSeveridad,
      ultimoMes,
      lineasConIncidentes: parseInt(lineasConIncidentes.count, 10),
    };
  }

  /**
   * Marcar línea de vida como "con incidente"
   */
  private async markLineWithIncident(lineaVidaId: number): Promise<void> {
    // Esto podría agregar un flag en la entidad Record
    // Por ahora, la información se consulta directamente desde los accidentes
    this.logger.debug(`Línea de vida ${lineaVidaId} marcada con incidente`);
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(accident: Accident): AccidentResponseDto {
    return {
      id: accident.id,
      linea_vida_id: accident.linea_vida_id,
      fecha_accidente: accident.fecha_accidente,
      descripcion_incidente: accident.descripcion_incidente,
      persona_involucrada: accident.persona_involucrada,
      acciones_correctivas: accident.acciones_correctivas,
      evidencias_urls: accident.evidencias_urls
        ? JSON.parse(accident.evidencias_urls)
        : null,
      fecha_creacion: accident.fecha_creacion,
      reportado_por: accident.reportado_por,
      estado: accident.estado as EstadoAccidente,
      severidad: accident.severidad as SeveridadAccidente,
      lineaVida: accident.lineaVida
        ? {
            id: accident.lineaVida.id,
            codigo: accident.lineaVida.codigo,
            cliente: accident.lineaVida.cliente || '',
            ubicacion: accident.lineaVida.ubicacion || '',
          }
        : undefined,
      usuario: accident.usuario
        ? {
            id: accident.usuario.id,
            nombre: accident.usuario.nombre,
            apellidos: accident.usuario.apellidos || '',
          }
        : undefined,
    };
  }
}
