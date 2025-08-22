import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel', // Para futuros reportes
}

export class ExpiredRecordsReportDto {
  @ApiPropertyOptional({
    description: 'Filtrar por cliente (parcial)',
    example: 'Empresa ABC',
  })
  @IsOptional()
  @IsString()
  cliente?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ubicación (parcial)',
    example: 'Planta Norte',
  })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código de línea (parcial)',
    example: 'LV-001',
  })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento desde (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento_desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento hasta (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  fecha_vencimiento_hasta?: string;

  @ApiPropertyOptional({
    description: 'Formato del reporte',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.PDF;
}

export interface ExpiredRecordCardData {
  codigo: string;
  cliente: string;
  ubicacion: string;
  fecha_caducidad: Date;
  estado_actual: string;
  dias_vencido: number;
  longitud?: number;
  tipo_linea?: string;
  fecha_instalacion?: Date;
}

export interface ReportMetadata {
  titulo: string;
  fecha_generacion: Date;
  usuario_generador: string;
  total_registros: number;
  filtros_aplicados?: string[];
}
