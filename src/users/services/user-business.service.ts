import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserBusinessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Validar que no se elimine el último administrador del sistema
   */
  async validateAdminDeletion(userId: number): Promise<void> {
    // Obtener el usuario que se quiere eliminar
    const userToDelete = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userToDelete) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Si no es administrador, permitir eliminación
    if (userToDelete.rol !== 'ADMINISTRADOR') {
      return;
    }

    // Contar administradores activos
    const adminCount = await this.userRepository.count({
      where: { rol: 'ADMINISTRADOR' },
    });

    // Si solo hay un administrador y es el que se quiere eliminar, prohibir
    if (adminCount <= 1) {
      throw new ForbiddenException(
        'No se puede eliminar el último administrador del sistema. Debe haber al menos un administrador activo.',
      );
    }
  }

  /**
   * Validar cambio de rol (no permitir que el último admin cambie su rol)
   */
  async validateRoleChange(userId: number, newRole: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Si el usuario actual es administrador y quiere cambiar a otro rol
    if (user.rol === 'ADMINISTRADOR' && newRole !== 'ADMINISTRADOR') {
      const adminCount = await this.userRepository.count({
        where: { rol: 'ADMINISTRADOR' },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException(
          'No se puede cambiar el rol del último administrador. Debe haber al menos un administrador activo.',
        );
      }
    }
  }

  /**
   * Validar formato de email corporativo
   */
  validateCorporateEmail(email: string, requiredDomain?: string): boolean {
    if (!requiredDomain) return true; // Si no hay dominio requerido, cualquier email es válido

    const emailDomain = email.split('@')[1]?.toLowerCase();
    return emailDomain === requiredDomain.toLowerCase();
  }

  /**
   * Validar fortaleza de contraseña
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Mínimo 8 caracteres
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    // Al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    // Al menos una letra minúscula
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    // Al menos un número
    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    // Al menos un carácter especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(
        'La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?":{}|<>)',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtener estadísticas de usuarios para validaciones
   */
  async getUserStatistics(): Promise<{
    total: number;
    administradores: number;
    usuarios: number;
    inactivos: number;
  }> {
    const total = await this.userRepository.count();
    const administradores = await this.userRepository.count({
      where: { rol: 'ADMINISTRADOR' },
    });
    const usuarios = await this.userRepository.count({
      where: { rol: 'USUARIO' },
    });

    return {
      total,
      administradores,
      usuarios,
      inactivos: total - administradores - usuarios,
    };
  }

  /**
   * Validar que el username sea único
   */
  async validateUniqueUsername(
    username: string,
    excludeUserId?: number,
  ): Promise<void> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.usuario = :username', { username });

    if (excludeUserId) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const existingUser = await query.getOne();

    if (existingUser) {
      throw new BadRequestException('El nombre de usuario ya está en uso');
    }
  }

  /**
   * Validar que el email sea único
   */
  async validateUniqueEmail(
    email: string,
    excludeUserId?: number,
  ): Promise<void> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (excludeUserId) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const existingUser = await query.getOne();

    if (existingUser) {
      throw new BadRequestException('El email ya está en uso');
    }
  }
}
