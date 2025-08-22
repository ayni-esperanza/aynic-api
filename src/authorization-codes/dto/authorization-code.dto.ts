import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestAuthorizationDto {
  @ApiProperty({ description: 'ID del registro a eliminar' })
  @IsNumber()
  record_id: number;

  @ApiProperty({
    description: 'Justificación de la eliminación',
    required: false,
  })
  @IsOptional()
  @IsString()
  justification?: string;
}

export class GenerateAuthorizationDto {
  @ApiProperty({ description: 'ID de la solicitud de autorización' })
  @IsNumber()
  request_id: number;
}

export class ValidateAuthorizationDto {
  @ApiProperty({ description: 'ID del registro a eliminar' })
  @IsNumber()
  record_id: number;

  @ApiProperty({
    description: 'Código de autorización de 8 caracteres',
    example: 'ABC12345',
  })
  @IsString()
  @Length(8, 8, { message: 'El código debe tener exactamente 8 caracteres' })
  authorization_code: string;
}

export class AuthorizationRequestResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  record_id: number;

  @ApiProperty()
  record_code: string;

  @ApiProperty()
  requested_by: {
    id: number;
    username: string;
    name: string;
  };

  @ApiProperty()
  justification: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  status: string;
}
