import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecordMovementHistoryService } from './record-movement-history.service';
import {
  MovementHistoryFiltersDto,
  MovementHistoryResponseDto,
} from './dto/record-movement-history.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { MovementAction } from './entities/record-movement-history.entity';

@ApiTags('record-movement-history')
@Controller('record-movement-history')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordMovementHistoryController {
  constructor(
    private readonly movementHistoryService: RecordMovementHistoryService,
  ) {}

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener historial completo de movimientos con filtros',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página (default: 10)',
  })
  @ApiQuery({
    name: 'record_id',
    required: false,
    description: 'Filtrar por ID de registro',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: MovementAction,
    description: 'Filtrar por tipo de acción',
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    description: 'Filtrar por ID de usuario',
  })
  @ApiQuery({
    name: 'username',
    required: false,
    description: 'Filtrar por nombre de usuario',
  })
  @ApiQuery({
    name: 'record_code',
    required: false,
    description: 'Filtrar por código de registro',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    description: 'Fecha desde (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    description: 'Fecha hasta (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'is_record_active',
    required: false,
    description: 'Filtrar por estado del registro al momento de la acción',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Búsqueda en descripción',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimientos obtenida exitosamente',
    type: [MovementHistoryResponseDto],
  })
  findAll(@Query() filters: MovementHistoryFiltersDto) {
    return this.movementHistoryService.findAll(filters);
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener estadísticas del historial de movimientos',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  getStatistics() {
    return this.movementHistoryService.getMovementStatistics();
  }

  @Get('by-record/:recordId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener historial completo de un registro específico',
  })
  @ApiParam({ name: 'recordId', description: 'ID del registro' })
  @ApiResponse({
    status: 200,
    description: 'Historial del registro obtenido exitosamente',
    type: [MovementHistoryResponseDto],
  })
  getRecordHistory(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.movementHistoryService.getRecordHistory(recordId);
  }

  @Get('actions')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener lista de tipos de acciones disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Lista de acciones obtenida exitosamente',
  })
  getAvailableActions() {
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

    return Object.entries(actionLabels).map(([value, label]) => ({
      value,
      label,
    }));
  }

  @Get('usernames')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener lista de usernames únicos para filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usernames obtenida exitosamente',
  })
  getUsernames() {
    return this.movementHistoryService.getUniqueUsernames();
  }

  @Get('recent')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener movimientos recientes' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número de registros (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimientos recientes obtenidos exitosamente',
  })
  getRecentMovements(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 20;

    const filters: MovementHistoryFiltersDto = {
      page: 1,
      limit: limitNumber,
      sortBy: 'action_date',
      sortOrder: 'DESC',
      getPage: () => 1,
      getLimit: () => limitNumber,
      getSortBy: () => 'action_date',
      getSortOrder: () => 'DESC',
      getOffset: () => 0,
    };

    return this.movementHistoryService.findAll(filters);
  }

  @Get('by-date-range')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener movimientos en un rango de fechas' })
  @ApiQuery({
    name: 'start_date',
    required: true,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: true,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: MovementAction,
    description: 'Filtrar por tipo de acción',
  })
  getMovementsByDateRange(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('action') action?: MovementAction,
  ) {
    const filters: MovementHistoryFiltersDto = {
      date_from: startDate,
      date_to: endDate,
      action,
      page: 1,
      limit: 100,
      getPage: () => 1,
      getLimit: () => 100,
      getSortBy: () => 'action_date',
      getSortOrder: () => 'DESC',
      getOffset: () => 0,
    };

    return this.movementHistoryService.findAll(filters);
  }

  @Get('by-user/:userId')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary:
      'Obtener movimientos de un usuario específico (Solo Administradores)',
  })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Movimientos del usuario obtenidos exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  getMovementsByUser(@Param('userId', ParseIntPipe) userId: number) {
    const filters: MovementHistoryFiltersDto = {
      user_id: userId,
      page: 1,
      limit: 100,
      getPage: () => 1,
      getLimit: () => 100,
      getSortBy: () => 'action_date',
      getSortOrder: () => 'DESC',
      getOffset: () => 0,
    };

    return this.movementHistoryService.findAll(filters);
  }

  @Delete('cleanup/:days')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar historial antiguo - Mantenimiento (Solo Administradores)',
  })
  @ApiParam({
    name: 'days',
    description: 'Días de antigüedad para eliminar movimientos',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial limpiado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async cleanOldMovements(@Param('days', ParseIntPipe) days: number) {
    const deletedCount =
      await this.movementHistoryService.cleanOldMovements(days);
    return {
      message: `Se eliminaron ${deletedCount} registros de historial`,
      deletedCount,
    };
  }
}
