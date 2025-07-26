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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RecordsService, RecordFilters } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@ApiTags('records')
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de línea de vida' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async create(@Body() createRecordDto: CreateRecordDto) {
    return this.recordsService.create(createRecordDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los registros con filtros opcionales',
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
  findAll(@Query() filters: RecordFilters) {
    return this.recordsService.findAll(filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas generales de registros' })
  getStatistics() {
    return this.recordsService.getRecordStatistics();
  }

  @Get('expiring')
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
  @ApiOperation({ summary: 'Obtener registros vencidos' })
  getExpiredRecords() {
    return this.recordsService.getExpiredRecords();
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Obtener registros por estado' })
  getRecordsByStatus(@Param('status') status: string) {
    return this.recordsService.getRecordsByStatus(status);
  }

  @Get('by-code/:codigo')
  @ApiOperation({ summary: 'Buscar registro por código' })
  findByCode(@Param('codigo') codigo: string) {
    return this.recordsService.findByCode(codigo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.findOne(id);
  }

  @Patch(':id')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un registro' })
  @ApiResponse({ status: 204, description: 'Registro eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.recordsService.remove(id);
  }
}
