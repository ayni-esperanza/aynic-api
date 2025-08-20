import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'contrasenia'>> {
    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({
      where: { usuario: createUserDto.usuario },
    });

    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    // Hash de la contraseña ANTES de guardar
    const hashedPassword = await this.hashPassword(createUserDto.contrasenia);

    const user = this.userRepository.create({
      ...createUserDto,
      contrasenia: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Excluir la contraseña del resultado
    return {
      id: savedUser.id,
      usuario: savedUser.usuario,
      apellidos: savedUser.apellidos,
      cargo: savedUser.cargo,
      celular: savedUser.celular,
      email: savedUser.email,
      empresa: savedUser.empresa,
      nombre: savedUser.nombre,
      rol: savedUser.rol,
    };
  }

  async findAll(): Promise<Omit<User, 'contrasenia'>[]> {
    const users = await this.userRepository.find();
    return users.map((user) => ({
      id: user.id,
      usuario: user.usuario,
      apellidos: user.apellidos,
      cargo: user.cargo,
      celular: user.celular,
      email: user.email,
      empresa: user.empresa,
      nombre: user.nombre,
      rol: user.rol,
    }));
  }

  async findOne(id: number): Promise<Omit<User, 'contrasenia'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: user.id,
      usuario: user.usuario,
      apellidos: user.apellidos,
      cargo: user.cargo,
      celular: user.celular,
      email: user.email,
      empresa: user.empresa,
      nombre: user.nombre,
      rol: user.rol,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'contrasenia'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateUserDto.contrasenia) {
      updateUserDto.contrasenia = await this.hashPassword(
        updateUserDto.contrasenia,
      );
    }

    // Verificar si se está cambiando el username y si ya existe
    if (updateUserDto.usuario && updateUserDto.usuario !== user.usuario) {
      const existingUser = await this.userRepository.findOne({
        where: { usuario: updateUserDto.usuario },
      });

      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya existe');
      }
    }

    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });

    return {
      id: updatedUser!.id,
      usuario: updatedUser!.usuario,
      apellidos: updatedUser!.apellidos,
      cargo: updatedUser!.cargo,
      celular: updatedUser!.celular,
      email: updatedUser!.email,
      empresa: updatedUser!.empresa,
      nombre: updatedUser!.nombre,
      rol: updatedUser!.rol,
    };
  }

  /**
   * Actualizar perfil propio (sin empresa ni rol)
   */
  async updateOwnProfile(
    id: number,
    updateOwnProfileDto: UpdateOwnProfileDto,
  ): Promise<Omit<User, 'contrasenia'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateOwnProfileDto.contrasenia) {
      updateOwnProfileDto.contrasenia = await this.hashPassword(
        updateOwnProfileDto.contrasenia,
      );
    }

    // Verificar si se está cambiando el username y si ya existe
    if (
      updateOwnProfileDto.usuario &&
      updateOwnProfileDto.usuario !== user.usuario
    ) {
      const existingUser = await this.userRepository.findOne({
        where: { usuario: updateOwnProfileDto.usuario },
      });

      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya existe');
      }
    }

    // Actualizar solo campos permitidos (sin empresa ni rol)
    await this.userRepository.update(id, updateOwnProfileDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });

    return {
      id: updatedUser!.id,
      usuario: updatedUser!.usuario,
      apellidos: updatedUser!.apellidos,
      cargo: updatedUser!.cargo,
      celular: updatedUser!.celular,
      email: updatedUser!.email,
      empresa: updatedUser!.empresa,
      nombre: updatedUser!.nombre,
      rol: updatedUser!.rol,
    };
  }

  /**
   * Actualizar usuario (solo administradores - puede cambiar empresa y rol)
   */
  async updateByAdmin(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'contrasenia'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateUserDto.contrasenia) {
      updateUserDto.contrasenia = await this.hashPassword(
        updateUserDto.contrasenia,
      );
    }

    // Verificar si se está cambiando el username y si ya existe
    if (updateUserDto.usuario && updateUserDto.usuario !== user.usuario) {
      const existingUser = await this.userRepository.findOne({
        where: { usuario: updateUserDto.usuario },
      });

      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya existe');
      }
    }

    // Los administradores pueden cambiar todo, incluyendo empresa y rol
    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });

    return {
      id: updatedUser!.id,
      usuario: updatedUser!.usuario,
      apellidos: updatedUser!.apellidos,
      cargo: updatedUser!.cargo,
      celular: updatedUser!.celular,
      email: updatedUser!.email,
      empresa: updatedUser!.empresa,
      nombre: updatedUser!.nombre,
      rol: updatedUser!.rol,
    };
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.userRepository.remove(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { usuario: username } });
  }

  private async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
  }
}
