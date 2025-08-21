import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  MaxLength,
  IsEnum,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum EstadoAccidente {
  REPORTADO = 'REPORTADO',
  EN_INVESTIGACION = 'EN_INVESTIGACION',
  RESUELTO = 'RESUELTO',
}

export enum SeveridadAccidente {
  LEVE = 'LEVE',
  MODERADO = 'MODERADO',
  GRAVE = 'GRAVE',
  CRITICO = 'CRITICO',
}

export class CreateAccidentDto {
  @ApiProperty({
    description: 'ID de la línea de vida asociada',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la línea de vida es obligatorio' })
  linea_vida_id: number;

  @ApiProperty({
    description: 'Fecha en que ocurrió el accidente',
    example: '2024-01-15',
  })
  @IsDateString({}, { message: 'La fecha debe ser válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha del accidente es obligatoria' })
  fecha_accidente: string;

  @ApiProperty({
    description: 'Descripción detallada del incidente',
    example: 'Caída de trabajador durante inspección de línea de vida',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción del incidente es obligatoria' })
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  descripcion_incidente: string;

  @ApiPropertyOptional({
    description: 'Nombre de la persona involucrada (si aplica)',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'El nombre no puede exceder 200 caracteres',
  })
  persona_involucrada?: string;

  @ApiPropertyOptional({
    description: 'Acciones correctivas tomadas o propuestas',
    example:
      'Revisión completa del sistema de anclaje y capacitación adicional',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Las acciones correctivas no pueden exceder 2000 caracteres',
  })
  acciones_correctivas?: string;

  @ApiPropertyOptional({
    description: 'URLs de evidencias fotográficas o documentales',
    type: [String],
    example: [
      'https://storage.com/evidence1.jpg',
      'https://storage.com/report.pdf',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Cada evidencia debe ser una URL válida' })
  evidencias_urls?: string[];

  @ApiPropertyOptional({
    enum: SeveridadAccidente,
    description: 'Severidad del accidente',
    example: SeveridadAccidente.MODERADO,
  })
  @IsOptional()
  @IsEnum(SeveridadAccidente)
  severidad?: SeveridadAccidente;
}

export class UpdateAccidentDto extends PartialType(CreateAccidentDto) {
  @ApiPropertyOptional({
    enum: EstadoAccidente,
    description: 'Estado del accidente',
    example: EstadoAccidente.EN_INVESTIGACION,
  })
  @IsOptional()
  @IsEnum(EstadoAccidente)
  estado?: EstadoAccidente;
}

export class AccidentFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de línea de vida' })
  @IsOptional()
  @IsNumber()
  linea_vida_id?: number;

  @ApiPropertyOptional({
    enum: EstadoAccidente,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(EstadoAccidente)
  estado?: EstadoAccidente;

  @ApiPropertyOptional({
    enum: SeveridadAccidente,
    description: 'Filtrar por severidad',
  })
  @IsOptional()
  @IsEnum(SeveridadAccidente)
  severidad?: SeveridadAccidente;

  @ApiPropertyOptional({
    description: 'Fecha desde (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @ApiPropertyOptional({
    description: 'Buscar en descripción del incidente',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AccidentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  linea_vida_id: number;

  @ApiProperty()
  fecha_accidente: Date;

  @ApiProperty()
  descripcion_incidente: string;

  @ApiProperty()
  persona_involucrada: string | null;

  @ApiProperty()
  acciones_correctivas: string | null;

  @ApiProperty({ type: [String] })
  evidencias_urls: string[] | null;

  @ApiProperty()
  fecha_creacion: Date;

  @ApiProperty()
  reportado_por: number | null;

  @ApiProperty({ enum: EstadoAccidente })
  estado: EstadoAccidente;

  @ApiProperty({ enum: SeveridadAccidente })
  severidad: SeveridadAccidente;

  @ApiProperty()
  lineaVida?: {
    id: number;
    codigo: string;
    cliente: string;
    ubicacion: string;
  };

  @ApiProperty()
  usuario?: {
    id: number;
    nombre: string;
    apellidos: string;
  };
}
