import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertType, AlertPriority } from '../entities/alert.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateAlertDto {
  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  tipo: AlertType;

  @ApiProperty()
  @IsNumber()
  registro_id: number;

  @ApiProperty()
  @IsString()
  mensaje: string;

  @ApiProperty({ enum: AlertPriority, required: false })
  @IsOptional()
  @IsEnum(AlertPriority)
  prioridad?: AlertPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class UpdateAlertDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  leida?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fecha_leida?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mensaje?: string;

  @ApiProperty({ enum: AlertPriority, required: false })
  @IsOptional()
  @IsEnum(AlertPriority)
  prioridad?: AlertPriority;
}

export class AlertFiltersDto extends PaginationDto {
  @ApiProperty({ enum: AlertType, required: false })
  @IsOptional()
  @IsEnum(AlertType)
  tipo?: AlertType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  registro_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  leida?: boolean;

  @ApiProperty({ enum: AlertPriority, required: false })
  @IsOptional()
  @IsEnum(AlertPriority)
  prioridad?: AlertPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fecha_hasta?: string;
}
