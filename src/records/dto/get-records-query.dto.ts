import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetRecordsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por código (parcial)' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ description: 'Buscar por cliente (parcial)' })
  @IsOptional()
  @IsString()
  cliente?: string;

  @ApiPropertyOptional({ description: 'Buscar por equipo (parcial)' })
  @IsOptional()
  @IsString()
  equipo?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado actual' })
  @IsOptional()
  @IsString()
  estado_actual?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de línea' })
  @IsOptional()
  @IsString()
  tipo_linea?: string;

  @ApiPropertyOptional({ description: 'Buscar por ubicación (parcial)' })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional({ description: 'Filtrar por SEEC' })
  @IsOptional()
  @IsString()
  seec?: string;

  @ApiPropertyOptional({
    description: 'Fecha de caducidad desde',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  fecha_caducidad_desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha de caducidad hasta',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  fecha_caducidad_hasta?: string;

  @ApiPropertyOptional({
    description: 'Fecha de instalación desde',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  fecha_instalacion_desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha de instalación hasta',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  fecha_instalacion_hasta?: string;
}
