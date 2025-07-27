import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

// Decorador para marcar endpoints como públicos (sin autenticación)
export const Public = () => SetMetadata('isPublic', true);

// Decorador para especificar roles requeridos
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Decorador para obtener el usuario actual de la request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Interface para el usuario en la request (después de la autenticación)
export interface AuthenticatedUser {
  userId: number;
  username: string;
  role: string;
}
