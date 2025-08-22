import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaintenanceDto {
  @ApiProperty({
    description: 'ID de la línea de vida',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la línea de vida es obligatorio' })
  record_id: number;

  @ApiProperty({
    description: 'Fecha del mantenimiento',
    example: '2024-01-15',
  })
  @IsDateString({}, { message: 'La fecha debe ser válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha del mantenimiento es obligatoria' })
  maintenance_date: string;

  @ApiPropertyOptional({
    description: 'Descripción del mantenimiento realizado',
    example: 'Revisión y limpieza de anclajes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La descripción no puede exceder 500 caracteres',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Nueva longitud en metros (si se modifica)',
    example: 15.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser un número válido' })
  @IsNotEmpty({ message: 'La longitud no puede estar vacía si se proporciona' })
  new_length_meters?: number;
}

export class MaintenanceResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  record_id: number;

  @ApiProperty()
  maintenance_date: Date;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  previous_length_meters?: number;

  @ApiProperty()
  new_length_meters?: number;

  @ApiProperty()
  image_filename?: string;

  @ApiProperty()
  image_url?: string;

  @ApiProperty()
  image_size?: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  created_by?: number;

  @ApiProperty()
  record?: {
    id: number;
    codigo: string;
    cliente: string;
    ubicacion: string;
  };

  @ApiProperty()
  user?: {
    id: number;
    nombre: string;
    apellidos: string;
  };
}
