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
  @IsDateString(
    {},
    {
      message: 'fecha_instalacion debe ser una fecha válida (YYYY-MM-DD o ISO)',
    },
  )
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
  @IsDateString(
    {},
    {
      message: 'fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD o ISO)',
    },
  )
  fecha_vencimiento?: Date;

  @IsOptional()
  @IsString()
  estado_actual?: string;
}
