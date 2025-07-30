import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Guard para verificar ownership de recursos
 * Permite que usuarios solo accedan a sus propios recursos
 * Los administradores pueden acceder a todos los recursos
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si el ownership está habilitado para este endpoint
    const requiresOwnership = this.reflector.getAllAndOverride<boolean>(
      'requiresOwnership',
      [context.getHandler(), context.getClass()],
    );

    // Si no requiere ownership, permitir acceso
    if (!requiresOwnership) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los administradores pueden acceder a todos los recursos
    if (user.role === 'ADMINISTRADOR') {
      return true;
    }

    // Obtener el ID del recurso desde los parámetros de la URL
    const resourceId = this.extractResourceId(request);
    const resourceType = this.getResourceType(context);

    if (!resourceId) {
      throw new BadRequestException('ID del recurso no proporcionado');
    }

    // Verificar ownership según el tipo de recurso
    const isOwner = await this.checkOwnership(
      user.userId,
      resourceId,
      resourceType,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }

  /**
   * Extraer ID del recurso desde los parámetros de la URL
   */
  private extractResourceId(request: any): number | null {
    // Buscar en diferentes parámetros comunes
    const id =
      request.params.id || request.params.userId || request.params.recordId;
    return id ? parseInt(id, 10) : null;
  }

  /**
   * Determinar el tipo de recurso basado en la ruta
   */
  private getResourceType(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    if (path.includes('/users')) {
      return 'user';
    }
    if (path.includes('/records')) {
      return 'record';
    }
    if (path.includes('/alerts')) {
      return 'alert';
    }

    return 'unknown';
  }

  /**
   * Verificar ownership del recurso
   */
  private async checkOwnership(
    userId: number,
    resourceId: number,
    resourceType: string,
  ): Promise<boolean> {
    switch (resourceType) {
      case 'user':
        // Para usuarios, solo pueden acceder a su propio perfil
        return userId === resourceId;

      case 'record':
        // Para registros, permitir acceso a todos los usuarios
        return true;

      case 'alert':
        // Para alertas, permitir acceso a todos los usuarios
        return true;

      default:
        return false;
    }
  }
}

/**
 * Decorador para marcar endpoints que requieren ownership
 */
import { SetMetadata } from '@nestjs/common';

export const RequiresOwnership = () => SetMetadata('requiresOwnership', true);
