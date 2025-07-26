import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds =
      Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS')) || 10;
  }

  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, 'contrasenia'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.contrasenia))) {
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
    return null;
  }

  login(user: Omit<User, 'contrasenia'>) {
    const payload: JwtPayload = {
      username: user.usuario,
      sub: user.id,
      role: user.rol,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return await bcrypt.hash(plainPassword, this.saltRounds);
  }
}
