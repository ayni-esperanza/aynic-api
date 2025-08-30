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
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  RecordStatusHistoryService,
  StatusHistoryFilters,
} from './record-status-history.service';
import { CreateRecordStatusHistoryDto } from './dto/create-record-status-history.dto';
import { UpdateRecordStatusHistoryDto } from './dto/update-record-status-history.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('record-status-history')
@Controller('record-status-history')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordStatusHistoryController {
  constructor(
    private readonly recordStatusHistoryService: RecordStatusHistoryService,
  ) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Crear un nuevo registro en el historial de estados',
  })
  @ApiResponse({
    status: 201,
    description: 'Historial de estado creado exitosamente',
  })
  create(@Body() createRecordStatusHistoryDto: CreateRecordStatusHistoryDto) {
    return this.recordStatusHistoryService.create(createRecordStatusHistoryDto);
  }

  @Post('add-status-change')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Agregar un cambio de estado rápido' })
  @ApiResponse({
    status: 201,
    description: 'Cambio de estado agregado exitosamente',
  })
  addStatusChange(
    @Body() body: { registro_id: number; estado: string; observacion?: string },
  ) {
    return this.recordStatusHistoryService.addStatusChange(
      body.registro_id,
      body.estado,
      body.observacion,
    );
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener todo el historial de estados con filtros opcionales',
  })
  @ApiQuery({
    name: 'registro_id',
    required: false,
    description: 'Filtrar por ID de registro',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'observacion',
    required: false,
    description: 'Buscar en observaciones',
  })
  @ApiQuery({
    name: 'fecha_cambio_desde',
    required: false,
    description: 'Fecha de inicio',
  })
  @ApiQuery({
    name: 'fecha_cambio_hasta',
    required: false,
    description: 'Fecha de fin',
  })
  findAll(@Query() filters: StatusHistoryFilters) {
    return this.recordStatusHistoryService.findAll(filters);
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener estadísticas de estados' })
  getStatistics() {
    return this.recordStatusHistoryService.getStatusStatistics();
  }

  @Get('recent-activity')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener actividad reciente' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número de registros (default: 20)',
  })
  getRecentActivity(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    return this.recordStatusHistoryService.getRecentActivity(limitNumber);
  }

  @Get('by-period')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener cambios de estado por período' })
  @ApiQuery({
    name: 'fecha_inicio',
    required: true,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_fin',
    required: true,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  getStatusChangesByPeriod(
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.recordStatusHistoryService.getStatusChangesByPeriod(
      new Date(fechaInicio),
      new Date(fechaFin),
    );
  }

  @Get('by-record/:registroId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener historial completo de un registro específico',
  })
  @ApiParam({ name: 'registroId', description: 'ID del registro' })
  getHistoryByRecord(@Param('registroId', ParseIntPipe) registroId: number) {
    return this.recordStatusHistoryService.getHistoryByRecordId(registroId);
  }

  @Get('latest-by-record/:registroId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener el estado más reciente de un registro' })
  @ApiParam({ name: 'registroId', description: 'ID del registro' })
  getLatestStatusByRecord(
    @Param('registroId', ParseIntPipe) registroId: number,
  ) {
    return this.recordStatusHistoryService.getLatestStatusByRecordId(
      registroId,
    );
  }

  @Get('by-state/:estado')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener todos los cambios de un estado específico',
  })
  @ApiParam({ name: 'estado', description: 'Estado a buscar' })
  getHistoryByState(@Param('estado') estado: string) {
    return this.recordStatusHistoryService.getHistoryByState(estado);
  }

  @Get('date-range')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener historial en un rango de fechas' })
  @ApiQuery({
    name: 'inicio',
    required: true,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fin',
    required: true,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  getHistoryInDateRange(
    @Query('inicio') inicio: string,
    @Query('fin') fin: string,
  ) {
    return this.recordStatusHistoryService.getHistoryInDateRange(
      new Date(inicio),
      new Date(fin),
    );
  }

  @Get('has-history/:registroId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Verificar si un registro tiene historial' })
  @ApiParam({ name: 'registroId', description: 'ID del registro' })
  async hasHistory(@Param('registroId', ParseIntPipe) registroId: number) {
    const hasHistory =
      await this.recordStatusHistoryService.hasHistory(registroId);
    return { registroId, hasHistory };
  }

  @Get(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener un registro de historial por ID' })
  @ApiResponse({ status: 200, description: 'Registro de historial encontrado' })
  @ApiResponse({
    status: 404,
    description: 'Registro de historial no encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recordStatusHistoryService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Actualizar un registro de historial' })
  @ApiResponse({
    status: 200,
    description: 'Registro de historial actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Registro de historial no encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRecordStatusHistoryDto: UpdateRecordStatusHistoryDto,
  ) {
    return this.recordStatusHistoryService.update(
      id,
      updateRecordStatusHistoryDto,
    );
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un registro de historial (Solo Administradores)',
  })
  @ApiResponse({
    status: 204,
    description: 'Registro de historial eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Registro de historial no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.recordStatusHistoryService.remove(id);
  }

  @Delete('cleanup/:days')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar historial antiguo - Mantenimiento (Solo Administradores)',
  })
  @ApiParam({ name: 'days', description: 'Días de antigüedad para eliminar' })
  @ApiResponse({ status: 200, description: 'Historial limpiado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async cleanOldHistory(@Param('days', ParseIntPipe) days: number) {
    const deletedCount =
      await this.recordStatusHistoryService.cleanOldHistory(days);
    return {
      message: `Se eliminaron ${deletedCount} registros de historial`,
      deletedCount,
    };
  }
}
