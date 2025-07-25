import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateRecordStatusHistoryDto {
  @IsNumber()
  registro_id: number;

  @IsString()
  estado: string;

  @IsOptional()
  @IsDateString()
  fecha_cambio?: Date;

  @IsOptional()
  @IsString()
  observacion?: string;
}
