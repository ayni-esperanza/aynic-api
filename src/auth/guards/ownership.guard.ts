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

// Interfaz para el usuario autenticado
interface AuthenticatedUser {
  userId: number;
  username: string;
  role: string;
}

// Interfaz para la request
interface RequestWithUser {
  user: AuthenticatedUser;
  params: Record<string, string>;
  route?: {
    path: string;
  };
  url: string;
}

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

  canActivate(context: ExecutionContext): boolean {
    // Verificar si el ownership está habilitado para este endpoint
    const requiresOwnership = this.reflector.getAllAndOverride<boolean>(
      'requiresOwnership',
      [context.getHandler(), context.getClass()],
    );

    // Si no requiere ownership, permitir acceso
    if (!requiresOwnership) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
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
    const isOwner = this.checkOwnership(user.userId, resourceId, resourceType);

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
  private extractResourceId(request: RequestWithUser): number | null {
    // Buscar en diferentes parámetros comunes
    const idParam =
      request.params?.id || request.params?.userId || request.params?.recordId;

    return idParam ? parseInt(idParam, 10) : null;
  }

  /**
   * Determinar el tipo de recurso basado en la ruta
   */
  private getResourceType(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const path = request.route?.path || request.url;

    if (this.pathIncludes(path, '/users')) {
      return 'user';
    }
    if (this.pathIncludes(path, '/records')) {
      return 'record';
    }
    if (this.pathIncludes(path, '/alerts')) {
      return 'alert';
    }

    return 'unknown';
  }

  /**
   * Helper method para verificar si un path incluye una cadena
   */
  private pathIncludes(path: string, searchString: string): boolean {
    return typeof path === 'string' && path.includes(searchString);
  }

  /**
   * Verificar ownership del recurso
   */
  private checkOwnership(
    userId: number,
    resourceId: number,
    resourceType: string,
  ): boolean {
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
