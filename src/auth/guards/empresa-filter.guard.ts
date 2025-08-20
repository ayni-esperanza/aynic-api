import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class EmpresaFilterGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Si no hay usuario, el JwtAuthGuard se encargará
    }

    // Obtener información completa del usuario incluyendo empresa
    const fullUser = await this.userRepository.findOne({
      where: { id: user.userId },
    });

    if (!fullUser) {
      return false;
    }

    // Agregar información de empresa al request para uso posterior
    request.userEmpresa = {
      empresa: fullUser.empresa,
      isAyniUser: fullUser.empresa.toLowerCase() === 'ayni',
    };

    return true;
  }
}
