import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationshipType } from '../entities/record-relationship.entity';
import { CreateRecordDto } from '../../records/dto/create-record.dto';

export class CreateChildRecordDto extends CreateRecordDto {
  // Hereda todos los campos de CreateRecordDto
  // Permitiendo modificar cualquier campo de la línea clonada
}

export class CreateRelationshipDto {
  @ApiProperty({
    description: 'ID de la línea de vida original (padre)',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID de la línea padre es obligatorio' })
  parent_record_id: number;

  @ApiProperty({
    description: 'Tipo de relación',
    enum: RelationshipType,
    example: RelationshipType.DIVISION,
  })
  @IsEnum(RelationshipType)
  @IsNotEmpty({ message: 'El tipo de relación es obligatorio' })
  relationship_type: RelationshipType;

  @ApiProperty({
    description: 'Nuevas líneas de vida a crear',
    type: [CreateChildRecordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChildRecordDto)
  child_records: CreateChildRecordDto[];

  @ApiPropertyOptional({
    description: 'Notas sobre la relación',
    example: 'División por mantenimiento - se cambió ubicación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}

export class RelationshipResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  parent_record_id: number;

  @ApiProperty()
  child_record_id: number;

  @ApiProperty({ enum: RelationshipType })
  relationship_type: RelationshipType;

  @ApiProperty()
  notes?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  created_by: number;

  @ApiProperty()
  parent_record?: {
    id: number;
    codigo: string;
    cliente: string;
    estado_actual: string;
  };

  @ApiProperty()
  child_record?: {
    id: number;
    codigo: string;
    cliente: string;
    estado_actual: string;
  };

  @ApiProperty()
  created_by_user?: {
    id: number;
    nombre: string;
    apellidos: string;
  };
}

export class CreateRelationshipResponseDto {
  @ApiProperty()
  parent_record: {
    id: number;
    codigo: string;
    new_status: string;
  };

  @ApiProperty()
  child_records: Array<{
    id: number;
    codigo: string;
  }>;

  @ApiProperty()
  relationships: RelationshipResponseDto[];

  @ApiProperty()
  message: string;
}
