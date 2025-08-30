import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
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

  async login(user: Omit<User, 'contrasenia'>, ipAddress?: string, userAgent?: string) {
    // Si el usuario es admin, invalidar sesiones anteriores
    if (user.rol === 'ADMINISTRADOR') {
      await this.invalidatePreviousSessions(user.id);
    }

    const payload: JwtPayload = {
      username: user.usuario,
      sub: user.id,
      role: user.rol,
    };
    
    const token = this.jwtService.sign(payload);
    
    // Crear nueva sesión
    await this.createSession(user.id, token, ipAddress, userAgent);
    
    return {
      access_token: token,
      user,
    };
  }

  private async invalidatePreviousSessions(userId: number): Promise<void> {
    await this.userSessionRepository.update(
      { user_id: userId, is_active: true },
      { is_active: false }
    );
  }

  private async createSession(
    userId: number, 
    token: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const session = this.userSessionRepository.create({
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 horas
      is_active: true,
    });

    await this.userSessionRepository.save(session);
  }

  async validateSession(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const session = await this.userSessionRepository.findOne({
      where: {
        token_hash: tokenHash,
        is_active: true,
      },
    });

    if (!session) {
      return false;
    }

    // Verificar si la sesión no ha expirado
    if (session.expires_at && session.expires_at < new Date()) {
      await this.userSessionRepository.update(
        { id: session.id },
        { is_active: false }
      );
      return false;
    }

    return true;
  }

  async logout(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await this.userSessionRepository.update(
      { token_hash: tokenHash },
      { is_active: false }
    );
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return await bcrypt.hash(plainPassword, this.saltRounds);
  }
}
