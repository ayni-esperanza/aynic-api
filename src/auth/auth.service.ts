import { Injectable } from '@nestjs/common';
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
      const { contrasenia, ...result } = user;
      return result as Omit<User, 'contrasenia'>;
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
    const saltRounds = 10; // o desde process.env.BCRYPT_SALT_ROUNDS
    return await bcrypt.hash(plainPassword, saltRounds);
  }
}
