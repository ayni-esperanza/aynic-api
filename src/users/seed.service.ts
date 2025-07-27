import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDefaultUsers(): Promise<void> {
    this.logger.log('Iniciando creación de usuarios predefinidos...');

    // Verificar si ya existen usuarios
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      this.logger.log('Ya existen usuarios en el sistema. Omitiendo seed.');
      return;
    }

    try {
      // Crear usuario administrador
      await this.createAdminUser();

      // Crear usuario normal
      await this.createNormalUser();

      this.logger.log('Usuarios predefinidos creados exitosamente');
    } catch (error) {
      this.logger.error('Error al crear usuarios predefinidos:', error);
    }
  }

  private async createAdminUser(): Promise<void> {
    const adminData = {
      usuario: 'admin',
      contrasenia: await this.hashPassword('admin123'),
      email: 'admin@aynic.com',
      nombre: 'Administrador',
      apellidos: 'del Sistema',
      empresa: 'Aynic',
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
      empresa: 'Aynic',
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

  private async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
  }

  // Método para resetear usuarios (útil para desarrollo)
  async resetUsers(): Promise<void> {
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
}
