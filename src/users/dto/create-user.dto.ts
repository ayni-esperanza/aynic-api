import { IsString, IsOptional, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre de usuario único' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  usuario: string;

  @ApiPropertyOptional({ description: 'Apellidos del usuario' })
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiPropertyOptional({ description: 'Cargo del usuario' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ description: 'Número de celular' })
  @IsOptional()
  @IsString()
  celular?: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  contrasenia: string;

  @ApiProperty({ description: 'Correo electrónico' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({
    description: 'Empresa a la que está vinculado el usuario',
    example: 'Ayni',
  })
  @IsString()
  @IsNotEmpty({ message: 'La empresa vinculada es obligatoria' })
  empresa: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: ['ADMINISTRADOR', 'USUARIO'],
    example: 'USUARIO',
  })
  @IsString()
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  rol: string;
}
