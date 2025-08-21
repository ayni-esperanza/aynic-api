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
import { AccidentsService } from './accidents.service';
import {
  CreateAccidentDto,
  UpdateAccidentDto,
  AccidentFiltersDto,
  AccidentResponseDto,
  EstadoAccidente,
  SeveridadAccidente,
} from './dto/accident.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';

@ApiTags('accidents')
@Controller('accidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccidentsController {
  constructor(private readonly accidentsService: AccidentsService) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Registrar un nuevo accidente' })
  @ApiResponse({
    status: 201,
    description: 'Accidente registrado exitosamente',
    type: AccidentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Línea de vida no encontrada' })
  @ApiResponse({ status: 400, description: 'Fecha de accidente inválida' })
  create(
    @Body() createAccidentDto: CreateAccidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accidentsService.create(createAccidentDto, user.userId);
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener todos los accidentes con filtros' })
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
    name: 'linea_vida_id',
    required: false,
    description: 'Filtrar por ID de línea de vida',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoAccidente,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'severidad',
    required: false,
    enum: SeveridadAccidente,
    description: 'Filtrar por severidad',
  })
  @ApiQuery({
    name: 'fecha_desde',
    required: false,
    description: 'Fecha desde (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_hasta',
    required: false,
    description: 'Fecha hasta (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar en descripción del incidente',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de accidentes obtenida exitosamente',
  })
  findAll(@Query() filters: AccidentFiltersDto) {
    return this.accidentsService.findAll(filters);
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener estadísticas de accidentes' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        porEstado: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              estado: { enum: Object.values(EstadoAccidente) },
              count: { type: 'number' },
            },
          },
        },
        porSeveridad: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severidad: { enum: Object.values(SeveridadAccidente) },
              count: { type: 'number' },
            },
          },
        },
        ultimoMes: { type: 'number' },
        lineasConIncidentes: { type: 'number' },
      },
    },
  })
  getStatistics() {
    return this.accidentsService.getAccidentStatistics();
  }

  @Get('by-linea-vida/:lineaVidaId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener accidentes de una línea de vida específica',
  })
  @ApiParam({ name: 'lineaVidaId', description: 'ID de la línea de vida' })
  @ApiResponse({
    status: 200,
    description: 'Accidentes de la línea de vida obtenidos exitosamente',
    type: [AccidentResponseDto],
  })
  getAccidentsByLineaVida(
    @Param('lineaVidaId', ParseIntPipe) lineaVidaId: number,
  ) {
    return this.accidentsService.getAccidentsByLineaVida(lineaVidaId);
  }

  @Get('recent')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener accidentes recientes' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número de registros (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Accidentes recientes obtenidos exitosamente',
  })
  getRecentAccidents(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    const filters: AccidentFiltersDto = {
      page: 1,
      limit: limitNumber,
      sortBy: 'fecha_creacion',
      sortOrder: 'DESC',
      getPage: () => 1,
      getLimit: () => limitNumber,
      getSortBy: () => 'fecha_creacion',
      getSortOrder: () => 'DESC',
      getOffset: () => 0,
    };

    return this.accidentsService.findAll(filters);
  }

  @Get('by-severity/:severidad')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener accidentes por severidad' })
  @ApiParam({
    name: 'severidad',
    enum: SeveridadAccidente,
    description: 'Severidad del accidente',
  })
  @ApiResponse({
    status: 200,
    description: 'Accidentes filtrados por severidad',
  })
  getAccidentsBySeverity(@Param('severidad') severidad: SeveridadAccidente) {
    const filters: AccidentFiltersDto = {
      severidad,
      page: 1,
      limit: 100,
      getPage: () => 1,
      getLimit: () => 100,
      getSortBy: () => 'fecha_accidente',
      getSortOrder: () => 'DESC',
      getOffset: () => 0,
    };

    return this.accidentsService.findAll(filters);
  }

  @Get(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener un accidente por ID' })
  @ApiParam({ name: 'id', description: 'ID del accidente' })
  @ApiResponse({
    status: 200,
    description: 'Accidente encontrado',
    type: AccidentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Accidente no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.accidentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Actualizar un accidente' })
  @ApiParam({ name: 'id', description: 'ID del accidente' })
  @ApiResponse({
    status: 200,
    description: 'Accidente actualizado exitosamente',
    type: AccidentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Accidente no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccidentDto: UpdateAccidentDto,
  ) {
    return this.accidentsService.update(id, updateAccidentDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un accidente (Solo Administradores)' })
  @ApiParam({ name: 'id', description: 'ID del accidente' })
  @ApiResponse({ status: 204, description: 'Accidente eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Accidente no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.accidentsService.remove(id);
  }
}
