import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { GetRecordsQueryDto } from './dto/get-records-query.dto';
import { StatusUpdateService } from '../schedules/status-update.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('records')
@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly statusUpdateService: StatusUpdateService,
  ) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Crear un nuevo registro de línea de vida' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async create(@Body() createRecordDto: CreateRecordDto) {
    return this.recordsService.create(createRecordDto);
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener todos los registros con filtros y paginación',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Campo para ordenar (default: codigo)',
    example: 'codigo',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Dirección del ordenamiento (ASC/DESC)',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'codigo',
    required: false,
    description: 'Buscar por código (parcial)',
  })
  @ApiQuery({
    name: 'cliente',
    required: false,
    description: 'Buscar por cliente (parcial)',
  })
  @ApiQuery({
    name: 'equipo',
    required: false,
    description: 'Buscar por equipo (parcial)',
  })
  @ApiQuery({
    name: 'estado_actual',
    required: false,
    description: 'Filtrar por estado actual',
  })
  @ApiQuery({
    name: 'tipo_linea',
    required: false,
    description: 'Filtrar por tipo de línea',
  })
  @ApiQuery({
    name: 'ubicacion',
    required: false,
    description: 'Buscar por ubicación (parcial)',
  })
  @ApiQuery({ name: 'seec', required: false, description: 'Filtrar por SEEC' })
  findAll(@Query() query: GetRecordsQueryDto) {
    return this.recordsService.findAll(query);
  }

  @Get('validation-rules')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener reglas de validación para registros' })
  @ApiResponse({ status: 200, description: 'Reglas de validación obtenidas' })
  getValidationRules() {
    return {
      estados_validos: [
        'ACTIVO',
        'POR_VENCER',
        'VENCIDO',
        'INACTIVO',
        'MANTENIMIENTO',
      ],
      longitud_maxima: {
        codigo: 50,
        cliente: 100,
        equipo: 100,
        observaciones: 1000,
        seec: 50,
        tipo_linea: 100,
        ubicacion: 200,
      },
      rangos_numericos: {
        fv_anios: { min: 1, max: 100 },
        fv_meses: { min: 0, max: 11 },
        longitud: { min: 0, max: 10000 },
      },
      validaciones_fechas: {
        fecha_vencimiento_debe_ser_posterior_a_instalacion: true,
        maximo_anos_futuro: 50,
        maximo_anos_pasado: 100,
      },
    };
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener estadísticas generales de registros' })
  async getStatistics() {
    const basicStats = await this.recordsService.getRecordStatistics();
    const statusStats = await this.statusUpdateService.getStatusStatistics();

    return {
      ...basicStats,
      statusBreakdown: statusStats,
      lastUpdate: statusStats.ultimaActualizacion,
    };
  }

  @Post('recalculate-states')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary:
      'Recalcular estados de todos los registros manualmente (Solo Administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estados recalculados exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async recalculateStates() {
    return this.statusUpdateService.manualStatusUpdate();
  }

  @Get('expiring')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener registros que vencen pronto' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Días hacia el futuro (default: 30)',
  })
  getExpiringRecords(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.recordsService.getExpiringRecords(daysNumber);
  }

  @Get('expired')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener registros vencidos' })
  getExpiredRecords() {
    return this.recordsService.getExpiredRecords();
  }

  @Get('by-status/:status')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener registros por estado' })
  getRecordsByStatus(@Param('status') status: string) {
    return this.recordsService.getRecordsByStatus(status);
  }

  @Get('by-code/:codigo')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Buscar registro por código' })
  findByCode(@Param('codigo') codigo: string) {
    return this.recordsService.findByCode(codigo);
  }

  @Get(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener un registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Actualizar un registro' })
  @ApiResponse({
    status: 200,
    description: 'Registro actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRecordDto: UpdateRecordDto,
  ) {
    return this.recordsService.update(id, updateRecordDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un registro (Solo Administradores)' })
  @ApiResponse({ status: 204, description: 'Registro eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.recordsService.remove(id);
  }
}
