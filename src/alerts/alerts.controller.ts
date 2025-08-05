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
import { AlertsService } from './alerts.service';
import { AlertGeneratorService } from './services/alert-generator.service';
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertFiltersDto,
} from './dto/alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly alertGeneratorService: AlertGeneratorService,
  ) {}

  @Post()
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Crear una nueva alerta manualmente (Solo Administradores)',
  })
  @ApiResponse({ status: 201, description: 'Alerta creada exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  create(@Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(createAlertDto);
  }

  @Post('generate')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Generar alertas manualmente (Solo Administradores)',
  })
  @ApiResponse({ status: 201, description: 'Alertas generadas exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async generateAlerts() {
    return this.alertGeneratorService.generateAlertsManually();
  }

  @Get()
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary:
      'Obtener todas las alertas con filtros y paginación (Solo Administradores)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    description: 'Filtrar por tipo de alerta',
  })
  @ApiQuery({
    name: 'leida',
    required: false,
    description: 'Filtrar por estado de lectura',
  })
  @ApiQuery({
    name: 'prioridad',
    required: false,
    description: 'Filtrar por prioridad',
  })
  @ApiQuery({
    name: 'registro_id',
    required: false,
    description: 'Filtrar por ID de registro',
  })
  findAll(@Query() filters: AlertFiltersDto) {
    return this.alertsService.findAll(filters);
  }

  @Get('unread-count')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener contador de alertas no leídas' })
  @ApiResponse({ status: 200, description: 'Contador obtenido exitosamente' })
  getUnreadCount() {
    return this.alertsService.getUnreadCount();
  }

  @Get('dashboard')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener resumen ejecutivo para dashboard' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido exitosamente' })
  getDashboard() {
    return this.alertsService.getDashboardSummary();
  }

  @Get('critical')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener alertas críticas activas' })
  @ApiResponse({ status: 200, description: 'Alertas críticas obtenidas' })
  getCriticalAlerts() {
    return this.alertsService.getCriticalAlerts();
  }

  @Get('by-record/:registroId')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener alertas de un registro específico' })
  @ApiParam({ name: 'registroId', description: 'ID del registro' })
  getAlertsByRecord(@Param('registroId', ParseIntPipe) registroId: number) {
    return this.alertsService.getAlertsByRecord(registroId);
  }

  @Get('stats-by-period')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener estadísticas de alertas por período' })
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
  getStatsByPeriod(
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    return this.alertsService.getAlertStatsByPeriod(
      new Date(fechaInicio),
      new Date(fechaFin),
    );
  }

  @Patch('mark-all-read')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Marcar todas las alertas como leídas' })
  @ApiResponse({
    status: 200,
    description: 'Todas las alertas marcadas como leídas',
  })
  markAllAsRead() {
    return this.alertsService.markAllAsRead();
  }

  @Get(':id')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener una alerta por ID' })
  @ApiResponse({ status: 200, description: 'Alerta encontrada' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Actualizar una alerta' })
  @ApiResponse({ status: 200, description: 'Alerta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAlertDto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, updateAlertDto);
  }

  @Patch(':id/read')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Marcar una alerta como leída' })
  @ApiResponse({ status: 200, description: 'Alerta marcada como leída' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.markAsRead(id);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una alerta (Solo Administradores)' })
  @ApiResponse({ status: 204, description: 'Alerta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.alertsService.remove(id);
  }

  @Delete('cleanup/:days')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar alertas antiguas - Mantenimiento (Solo Administradores)',
  })
  @ApiParam({
    name: 'days',
    description: 'Días de antigüedad para eliminar alertas leídas',
  })
  @ApiResponse({ status: 200, description: 'Alertas limpiadas exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async cleanOldAlerts(@Param('days', ParseIntPipe) days: number) {
    const deletedCount = await this.alertsService.cleanOldAlerts(days);
    return {
      message: `Se eliminaron ${deletedCount} alertas antiguas`,
      deletedCount,
    };
  }
}
