import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async createDefaultUsers(): Promise<void> {
    const environment = this.configService.get<string>('NODE_ENV');
    const createUsers =
      this.configService.get<string>('CREATE_DEFAULT_USERS') === 'true';

    // En producción, solo crear si se permite explícitamente
    if (environment === 'production' && !createUsers) {
      this.logger.log(
        'Entorno de producción: omitiendo creación automática de usuarios',
      );
      return;
    }

    this.logger.log('Verificando usuarios del sistema...');

    try {
      // Verificar usuarios específicos en lugar de count total
      const adminExists = await this.userRepository.findOne({
        where: { usuario: 'admin' },
      });

      const userExists = await this.userRepository.findOne({
        where: { usuario: 'usuario' },
      });

      // Crear admin solo si no existe
      if (!adminExists) {
        await this.createAdminUser();
      } else {
        this.logger.log('Usuario admin ya existe, omitiendo creación.');
      }

      // Crear usuario normal solo si no existe
      if (!userExists) {
        await this.createNormalUser();
      } else {
        this.logger.log('Usuario normal ya existe, omitiendo creación.');
      }

      // Verificar que exista al menos un administrador
      await this.ensureAdminExists();
    } catch (error) {
      this.logger.error('Error al verificar/crear usuarios:', error);
    }
  }

  private async createAdminUser(): Promise<void> {
    const adminData = {
      usuario: 'admin',
      contrasenia: await this.hashPassword('admin123'),
      email: 'admin@aynic.com',
      nombre: 'Administrador',
      apellidos: 'del Sistema',
      empresa: 'Ayni',
      rol: 'ADMINISTRADOR',
      cargo: 'Administrador del Sistema',
      celular: '+51 999 999 999',
    };

    const admin = this.userRepository.create(adminData);
    await this.userRepository.save(admin);

    this.logger.log('   Usuario ADMINISTRADOR creado:');
    this.logger.log(`   Usuario: ${adminData.usuario}`);
    this.logger.log(`   Contraseña: admin123`);
    this.logger.log(`   Email: ${adminData.email}`);
  }

  private async createNormalUser(): Promise<void> {
    const userData = {
      usuario: 'usuario',
      contrasenia: await this.hashPassword('user123'),
      email: 'usuario@aynic.com',
      nombre: 'Usuario',
      apellidos: 'de Prueba',
      empresa: 'Ayni',
      rol: 'USUARIO',
      cargo: 'Operador',
      celular: '+51 888 888 888',
    };

    const user = this.userRepository.create(userData);
    await this.userRepository.save(user);

    this.logger.log('👤 Usuario NORMAL creado:');
    this.logger.log(`   Usuario: ${userData.usuario}`);
    this.logger.log(`   Contraseña: user123`);
    this.logger.log(`   Email: ${userData.email}`);
  }

  private async ensureAdminExists(): Promise<void> {
    const adminCount = await this.userRepository.count({
      where: { rol: 'ADMINISTRADOR' },
    });

    if (adminCount === 0) {
      this.logger.warn('ALERTA: No hay administradores en el sistema');
      this.logger.warn('Creando administrador de emergencia...');
      await this.createAdminUser();
      this.logger.warn(
        'ACCIÓN REQUERIDA: Cambiar credenciales del admin por seguridad',
      );
    } else {
      this.logger.log(`Sistema tiene ${adminCount} administrador(es)`);
    }
  }

  private async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds =
      Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS')) || 10;
    return await bcrypt.hash(plainPassword, saltRounds);
  }

  // Método para resetear usuarios (útil para desarrollo)
  async resetUsers(): Promise<void> {
    const environment = this.configService.get<string>('NODE_ENV');

    if (environment === 'production') {
      this.logger.error('RESET no permitido en producción');
      return;
    }

    this.logger.log('Reseteando usuarios...');

    // Eliminar todos los usuarios
    await this.userRepository.clear();

    // Crear usuarios predefinidos nuevamente
    await this.createDefaultUsers();

    this.logger.log('Reset de usuarios completado');
  }

  // Método para verificar credenciales predefinidas
  getDefaultCredentials() {
    return {
      admin: {
        usuario: 'admin',
        contrasenia: 'admin123',
        rol: 'ADMINISTRADOR',
      },
      user: {
        usuario: 'usuario',
        contrasenia: 'user123',
        rol: 'USUARIO',
      },
    };
  }

  // Método para crear administrador de emergencia en producción
  async createEmergencyAdmin(): Promise<void> {
    this.logger.warn('Creando administrador de emergencia...');
    await this.createAdminUser();
    this.logger.warn('Cambie las credenciales inmediatamente por seguridad');
  }
}
