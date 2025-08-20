import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsString, IsOptional, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// usuarios que actualizan su propio perfil (sin empresa)
export class UpdateOwnProfileDto extends PartialType(
  OmitType(CreateUserDto, ['empresa', 'rol'] as const),
) {}

// administradores (pueden cambiar todo, incluyendo empresa)
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Empresa vinculada (solo administradores pueden modificar)',
    example: 'Ayni',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La empresa no puede estar vacía' })
  empresa?: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario (solo administradores pueden modificar)',
    enum: ['ADMINISTRADOR', 'USUARIO'],
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El rol no puede estar vacío' })
  rol?: string;
}
