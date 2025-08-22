import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  AuthorizationCode,
  AuthorizationAction,
  AuthorizationStatus,
} from './entities/authorization-code.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { User } from '../users/entities/user.entity';
import {
  RequestAuthorizationDto,
  GenerateAuthorizationDto,
  ValidateAuthorizationDto,
  AuthorizationRequestResponseDto,
} from './dto/authorization-code.dto';

@Injectable()
export class AuthorizationCodeService {
  private readonly logger = new Logger(AuthorizationCodeService.name);
  private readonly CODE_EXPIRY_MINUTES = 10; // 10 minutos de validez

  constructor(
    @InjectRepository(AuthorizationCode)
    private readonly authCodeRepository: Repository<AuthorizationCode>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Solicitar autorización para eliminar un registro
   */
  async requestAuthorization(
    dto: RequestAuthorizationDto,
    requestedByUserId: number,
    requestIp?: string,
  ): Promise<AuthorizationRequestResponseDto> {
    // Verificar que el registro existe
    const record = await this.recordRepository.findOne({
      where: { id: dto.record_id },
    });

    if (!record) {
      throw new NotFoundException('Registro no encontrado');
    }

    // Verificar que realmente necesita autorización (> 3 días)
    const needsAuth = await this.checkIfNeedsAuthorization(
      dto.record_id,
      requestedByUserId,
    );

    if (!needsAuth) {
      throw new BadRequestException(
        'Este registro puede ser eliminado directamente sin autorización (creado hace 3 días o menos)',
      );
    }

    // Verificar que no hay una solicitud pendiente para este registro
    const existingRequest = await this.authCodeRepository.findOne({
      where: {
        resource_id: dto.record_id,
        requested_by_user_id: requestedByUserId,
        status: AuthorizationStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Ya existe una solicitud pendiente para este registro',
      );
    }

    // Crear nueva solicitud
    const authRequest = this.authCodeRepository.create({
      action: AuthorizationAction.DELETE_RECORD,
      resource_id: dto.record_id,
      resource_code: record.codigo,
      requested_by_user_id: requestedByUserId,
      status: AuthorizationStatus.PENDING,
      expires_at: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000),
      request_ip: requestIp,
      justification: dto.justification,
      code: 'PENDING', // Se genera cuando el admin aprueba
    });

    const savedRequest = await this.authCodeRepository.save(authRequest);

    // Obtener usuario para la respuesta
    const user = await this.userRepository.findOne({
      where: { id: requestedByUserId },
    });

    this.logger.log(
      `Solicitud de autorización creada: ID=${savedRequest.id}, Registro=${record.codigo}, Usuario=${user?.usuario}`,
    );

    return {
      id: savedRequest.id,
      record_id: savedRequest.resource_id,
      record_code: savedRequest.resource_code,
      requested_by: {
        id: user!.id,
        username: user!.usuario,
        name: `${user!.nombre} ${user!.apellidos || ''}`.trim(),
      },
      justification: savedRequest.justification,
      created_at: savedRequest.created_at,
      status: savedRequest.status,
    };
  }

  /**
   * Generar código de autorización (solo administradores)
   */
  async generateAuthorizationCode(
    dto: GenerateAuthorizationDto,
    authorizedByUserId: number,
  ): Promise<{ code: string; expires_in_minutes: number }> {
    // Buscar la solicitud
    const request = await this.authCodeRepository.findOne({
      where: { id: dto.request_id },
      relations: ['requested_by'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud de autorización no encontrada');
    }

    if (request.status !== AuthorizationStatus.PENDING) {
      throw new BadRequestException('La solicitud ya no está pendiente');
    }

    if (request.expires_at < new Date()) {
      throw new BadRequestException('La solicitud ha expirado');
    }

    // Generar código único de 8 caracteres
    const code = this.generateUniqueCode();

    // Actualizar la solicitud con el código
    await this.authCodeRepository.update(dto.request_id, {
      code,
      authorized_by_user_id: authorizedByUserId,
      expires_at: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000), // Renovar expiración
    });

    this.logger.log(
      `Código de autorización generado: ${code} para registro ${request.resource_code}`,
    );

    return {
      code,
      expires_in_minutes: this.CODE_EXPIRY_MINUTES,
    };
  }

  /**
   * Validar código de autorización
   */
  async validateAuthorizationCode(
    dto: ValidateAuthorizationDto,
    userId: number,
  ): Promise<{ valid: boolean; authorization_id?: number }> {
    const authCode = await this.authCodeRepository.findOne({
      where: {
        code: dto.authorization_code,
        resource_id: dto.record_id,
        requested_by_user_id: userId,
        status: AuthorizationStatus.PENDING,
      },
      relations: ['authorized_by'],
    });

    if (!authCode) {
      this.logger.warn(
        `Código inválido: ${dto.authorization_code} para registro ${dto.record_id}`,
      );
      return { valid: false };
    }

    if (authCode.expires_at < new Date()) {
      // Marcar como expirado
      await this.authCodeRepository.update(authCode.id, {
        status: AuthorizationStatus.EXPIRED,
      });

      this.logger.warn(
        `Código expirado: ${dto.authorization_code} para registro ${dto.record_id}`,
      );
      return { valid: false };
    }

    // Marcar como usado
    await this.authCodeRepository.update(authCode.id, {
      status: AuthorizationStatus.USED,
      used_at: new Date(),
    });

    this.logger.log(
      `Código validado exitosamente: ${dto.authorization_code} autorizado por ${authCode.authorized_by?.usuario}`,
    );

    return {
      valid: true,
      authorization_id: authCode.id,
    };
  }

  /**
   * Obtener solicitudes pendientes (para administradores)
   */
  async getPendingRequests(): Promise<AuthorizationRequestResponseDto[]> {
    const requests = await this.authCodeRepository.find({
      where: {
        status: AuthorizationStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
      relations: ['requested_by'],
      order: { created_at: 'DESC' },
    });

    return requests.map((request) => ({
      id: request.id,
      record_id: request.resource_id,
      record_code: request.resource_code,
      requested_by: {
        id: request.requested_by.id,
        username: request.requested_by.usuario,
        name: `${request.requested_by.nombre} ${request.requested_by.apellidos || ''}`.trim(),
      },
      justification: request.justification,
      created_at: request.created_at,
      status: request.status,
    }));
  }

  /**
   * Limpiar códigos expirados
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.authCodeRepository
      .createQueryBuilder()
      .update()
      .set({ status: AuthorizationStatus.EXPIRED })
      .where('expires_at < :now AND status = :status', {
        now: new Date(),
        status: AuthorizationStatus.PENDING,
      })
      .execute();

    this.logger.log(
      `Limpieza: ${result.affected || 0} códigos marcados como expirados`,
    );
    return result.affected || 0;
  }

  /**
   * Verificar estado de autorización para un registro específico
   */
  async checkRecordAuthorizationStatus(
    recordId: number,
    userId: number,
  ): Promise<{
    needs_authorization: boolean;
    message: string;
    days_since_creation?: number;
  }> {
    // Verificar que el registro existe
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Registro no encontrado');
    }

    // Obtener información de creación
    const creationEntry = await this.authCodeRepository.query(
      `
      SELECT action_date, user_id 
      FROM record_movement_history 
      WHERE record_id = $1 AND action = 'CREATE' 
      ORDER BY action_date ASC 
      LIMIT 1
    `,
      [recordId],
    );

    if (!creationEntry || creationEntry.length === 0) {
      return {
        needs_authorization: true,
        message:
          'Registro sin historial de creación - se requiere autorización',
      };
    }

    const creation = creationEntry[0];
    const now = new Date();
    const createdAt = new Date(creation.action_date);
    const diffInMs = now.getTime() - createdAt.getTime();
    const daysSinceCreation = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // Si no fue creado por el mismo usuario
    if (creation.user_id !== userId) {
      return {
        needs_authorization: true,
        message:
          'Solo puede eliminar registros creados por usted mismo sin autorización',
        days_since_creation: daysSinceCreation,
      };
    }

    // Verificar los 3 días
    if (daysSinceCreation <= 3) {
      return {
        needs_authorization: false,
        message: `Puede eliminar directamente (creado hace ${daysSinceCreation} días)`,
        days_since_creation: daysSinceCreation,
      };
    }

    return {
      needs_authorization: true,
      message: `Requiere autorización (creado hace ${daysSinceCreation} días, límite: 3 días)`,
      days_since_creation: daysSinceCreation,
    };
  }

  /**
   * Verificar si un registro necesita autorización (> 3 días)
   */
  private async checkIfNeedsAuthorization(
    recordId: number,
    userId: number,
  ): Promise<boolean> {
    // Buscar la fecha de creación en el historial de movimientos
    const creationEntry = await this.authCodeRepository.query(
      `
      SELECT action_date, user_id 
      FROM record_movement_history 
      WHERE record_id = $1 AND action = 'CREATE' 
      ORDER BY action_date ASC 
      LIMIT 1
    `,
      [recordId],
    );

    if (!creationEntry || creationEntry.length === 0) {
      // Si no hay historial, asumir que es antiguo y necesita autorización
      return true;
    }

    const creation = creationEntry[0];

    // Si no fue creado por el mismo usuario, necesita autorización
    if (creation.user_id !== userId) {
      return true;
    }

    // Calcular diferencia en días
    const now = new Date();
    const createdAt = new Date(creation.action_date);
    const diffInMs = now.getTime() - createdAt.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // Necesita autorización si han pasado más de 3 días
    return diffInDays > 3;
  }

  /**
   * Generar código único de 8 caracteres
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }
}
