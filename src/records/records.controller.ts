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
import { RecordsService, RecordFilters } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
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
  @Roles('ADMINISTRADOR', 'USUARIO') // Ambos roles pueden crear registros
  @ApiOperation({ summary: 'Crear un nuevo registro de línea de vida' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async create(@Body() createRecordDto: CreateRecordDto) {
    return this.recordsService.create(createRecordDto);
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO') // Ambos roles pueden ver registros
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
  findAll(
    @Query() filters: RecordFilters,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.recordsService.findAll(filters, paginationDto);
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR', 'USUARIO') // Ambos pueden ver estadísticas
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
  @Roles('ADMINISTRADOR') // Solo administradores pueden forzar recálculo
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
  @Roles('ADMINISTRADOR', 'USUARIO') // Ambos roles pueden actualizar registros
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
  @Roles('ADMINISTRADOR') // Solo administradores pueden eliminar
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
