import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateRecordDto {
  @IsString()
  codigo: string;

  @IsOptional()
  @IsString()
  cliente?: string;

  @IsOptional()
  @IsString()
  equipo?: string;

  @IsOptional()
  @IsNumber()
  fv_anios?: number;

  @IsOptional()
  @IsNumber()
  fv_meses?: number;

  @IsOptional()
  @IsDateString()
  fecha_instalacion?: Date;

  @IsOptional()
  @IsNumber()
  longitud?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  seec?: string;

  @IsOptional()
  @IsString()
  tipo_linea?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: Date;

  @IsOptional()
  @IsString()
  estado_actual?: string;
}
