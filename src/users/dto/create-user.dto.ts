import { IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  usuario: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsString()
  contrasenia: string;

  @IsString()
  email: string;

  @IsString()
  empresa: string;

  @IsString()
  nombre: string;

  @IsString()
  rol: string;
}
