import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-user.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';

@ApiTags('users')
@Controller('users')
@UseGuards(SessionAuthGuard, RolesGuard) // Protección global para este controlador
@ApiBearerAuth() // Documentación Swagger para autenticación
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMINISTRADOR') // Solo administradores pueden crear usuarios
  @ApiOperation({ summary: 'Crear un nuevo usuario (Solo Administradores)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMINISTRADOR') // Solo administradores pueden ver todos los usuarios
  @ApiOperation({
    summary: 'Obtener todos los usuarios (Solo Administradores)',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.userId);
  }

  @Get(':id')
  @Roles('ADMINISTRADOR') // Solo administradores pueden ver otros usuarios
  @ApiOperation({ summary: 'Obtener un usuario por ID (Solo Administradores)' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar perfil propio (sin empresa ni rol)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateOwnProfileDto: UpdateOwnProfileDto,
  ) {
    // Los usuarios solo pueden actualizar su propio perfil (sin empresa ni rol)
    return this.usersService.updateOwnProfile(user.userId, updateOwnProfileDto);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR') // Solo administradores pueden actualizar usuarios
  @ApiOperation({
    summary:
      'Actualizar cualquier usuario incluyendo empresa y rol (Solo Administradores)',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Solo administradores pueden cambiar empresa, rol y datos de otros usuarios
    return this.usersService.updateByAdmin(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR') // Solo administradores pueden eliminar usuarios
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un usuario (Solo Administradores)' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
  }
}
