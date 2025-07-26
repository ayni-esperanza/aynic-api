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
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'contrasenia'>> {
    const existingUser = await this.userRepository.findOne({
      where: { usuario: createUserDto.usuario },
    });

    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    // Hash de la contraseña antes de guardar
    const hashedPassword = await this.hashPassword(createUserDto.contrasenia);

    const user = this.userRepository.create({
      ...createUserDto,
      contrasenia: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Excluir la contraseña del resultado
    const { contrasenia, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findAll(): Promise<Omit<User, 'contrasenia'>[]> {
    const users = await this.userRepository.find();
    return users.map((user) => {
      const { contrasenia, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async findOne(id: number): Promise<Omit<User, 'contrasenia'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { contrasenia, ...userWithoutPassword } = user;
    return userWithoutPassword;
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

    const { contrasenia, ...userWithoutPassword } = updatedUser!;
    return userWithoutPassword;
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.userRepository.remove(user);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { usuario: username } });
  }

  private async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
  }
}
