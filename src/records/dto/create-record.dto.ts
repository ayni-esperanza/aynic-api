import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsAfterInstallationDate,
  IsReasonableFutureDate,
  IsReasonablePastDate,
  IsValidRecordStatus,
  IsReasonableLifespan,
  IsValidMonths,
} from '../../common/validators/business.validators';

export class CreateRecordDto {
  @ApiProperty({
    description: 'Código único del registro',
    example: 'LV-001-2024',
  })
  @IsString()
  @MinLength(3, { message: 'El código debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  codigo: string;

  @ApiProperty({ description: 'Nombre del cliente', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'El nombre del cliente no puede exceder 100 caracteres',
  })
  cliente?: string;

  @ApiProperty({
    description: 'Tipo de equipo o línea de vida',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'El nombre del equipo no puede exceder 100 caracteres',
  })
  equipo?: string;

  @ApiProperty({
    description: 'Años de vida útil',
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Los años de vida útil deben ser al menos 1' })
  @Max(100, { message: 'Los años de vida útil no pueden exceder 100' })
  @IsReasonableLifespan()
  fv_anios?: number;

  @ApiProperty({
    description: 'Meses adicionales de vida útil',
    minimum: 0,
    maximum: 11,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Los meses deben ser al menos 0' })
  @Max(11, { message: 'Los meses no pueden exceder 11' })
  @IsValidMonths()
  fv_meses?: number;

  @ApiProperty({ description: 'Fecha de instalación', required: false })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'fecha_instalacion debe ser una fecha válida (YYYY-MM-DD o ISO)',
    },
  )
  @IsReasonablePastDate()
  fecha_instalacion?: Date;

  @ApiProperty({
    description: 'Longitud en metros',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'La longitud debe ser un número positivo' })
  @Max(10000, { message: 'La longitud no puede exceder 10,000 metros' })
  longitud?: number;

  @ApiProperty({ description: 'Observaciones adicionales', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Las observaciones no pueden exceder 1000 caracteres',
  })
  observaciones?: string;

  @ApiProperty({ description: 'Código SEEC', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El código SEEC no puede exceder 50 caracteres' })
  seec?: string;

  @ApiProperty({ description: 'Tipo de línea de vida', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'El tipo de línea no puede exceder 100 caracteres',
  })
  tipo_linea?: string;

  @ApiProperty({ description: 'Ubicación del equipo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La ubicación no puede exceder 200 caracteres' })
  ubicacion?: string;

  @ApiProperty({ description: 'Fecha de vencimiento', required: false })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD o ISO)',
    },
  )
  @IsReasonableFutureDate()
  @IsAfterInstallationDate()
  fecha_vencimiento?: Date;

  @ApiProperty({
    description: 'Estado actual del registro',
    enum: ['ACTIVO', 'POR_VENCER', 'VENCIDO', 'INACTIVO', 'MANTENIMIENTO'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsValidRecordStatus()
  estado_actual?: string;
}
