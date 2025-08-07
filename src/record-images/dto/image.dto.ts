import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({
    description: 'Descripción opcional de la imagen',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}

export class ImageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  record_id: number;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  original_name: string;

  @ApiProperty()
  file_size: number;

  @ApiProperty()
  mime_type: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  upload_date: Date;

  @ApiProperty()
  uploaded_by?: number;

  @ApiProperty({ description: 'URL para acceder a la imagen' })
  image_url: string;
}

export class UpdateImageDto {
  @ApiProperty({
    description: 'Nueva descripción de la imagen',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}

