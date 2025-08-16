import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MovementAction } from '../entities/record-movement-history.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateMovementHistoryDto {
  @ApiProperty()
  @IsNumber()
  record_id: number;

  @ApiProperty({ enum: MovementAction })
  @IsEnum(MovementAction)
  action: MovementAction;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  previous_values?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  new_values?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  changed_fields?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_record_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  record_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additional_metadata?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class MovementHistoryFiltersDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  record_id?: number;

  @ApiProperty({ enum: MovementAction, required: false })
  @IsOptional()
  @IsEnum(MovementAction)
  action?: MovementAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  record_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_record_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string; // Búsqueda en descripción
}

export class MovementHistoryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  record_id: number;

  @ApiProperty()
  record_code: string | null;

  @ApiProperty({ enum: MovementAction })
  action: MovementAction;

  @ApiProperty()
  description: string;

  @ApiProperty()
  action_date: Date;

  @ApiProperty()
  user_id: number | null;

  @ApiProperty()
  username: string | null;

  @ApiProperty()
  previous_values: any | null; // Parsed JSON

  @ApiProperty()
  new_values: any | null; // Parsed JSON

  @ApiProperty()
  changed_fields: string[] | null; // Parsed array

  @ApiProperty()
  is_record_active: boolean;

  @ApiProperty()
  additional_metadata: any | null; // Parsed JSON

  @ApiProperty()
  ip_address: string | null;

  @ApiProperty()
  user_agent: string | null;

  @ApiProperty()
  formatted_date: string; // Fecha formateada para UI

  @ApiProperty()
  action_label: string; // Etiqueta legible de la acción

  @ApiProperty()
  user_display_name: string; // Nombre completo del usuario
}
