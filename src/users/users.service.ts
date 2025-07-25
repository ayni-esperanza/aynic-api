import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash de la contraseña ANTES de guardar
    const hashedPassword = await this.authService.hashPassword(
      createUserDto.contrasenia,
    );
    const user = this.userRepository.create({
      ...createUserDto,
      contrasenia: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    // findOne retorna undefined si no encuentra
    return this.userRepository.findOne({ where: { usuario: username } });
  }
}
