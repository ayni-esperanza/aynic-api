import { Controller, Get, Post, Body, UseGuards, Req, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UseInterceptors } from '@nestjs/common';
import { TrackingInterceptor } from '../record-movement-history/tracking.interceptor';
import { AuthorizationCodeService } from './authorization-code.service';
import {
  RequestAuthorizationDto,
  GenerateAuthorizationDto,
  ValidateAuthorizationDto,
  AuthorizationRequestResponseDto,
} from './dto/authorization-code.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';
@ApiTags('authorization-codes')
@Controller('authorization-codes')
@UseGuards(SessionAuthGuard, RolesGuard)
@UseInterceptors(TrackingInterceptor)
@ApiBearerAuth()
export class AuthorizationCodeController {
  constructor(
    private readonly authorizationCodeService: AuthorizationCodeService,
  ) {}

  @Post('request')
  @Roles('USUARIO') // Solo usuarios no-admin pueden solicitar
  @ApiOperation({
    summary: 'Solicitar autorización para eliminar un registro',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de autorización creada',
    type: AuthorizationRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ya existe una solicitud pendiente para este registro',
  })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async requestAuthorization(
    @Body() dto: RequestAuthorizationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any,
  ): Promise<AuthorizationRequestResponseDto> {
    const clientIp = request.trackingContext?.ipAddress;
    return this.authorizationCodeService.requestAuthorization(
      dto,
      user.userId,
      clientIp,
    );
  }

  @Post('generate')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Generar código de autorización (Solo Administradores)',
  })
  @ApiResponse({
    status: 201,
    description: 'Código de autorización generado',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'ABC12345' },
        expires_in_minutes: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud de autorización no encontrada',
  })
  @ApiResponse({
    status: 400,
    description: 'La solicitud ya no está pendiente o ha expirado',
  })
  async generateCode(
    @Body() dto: GenerateAuthorizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ code: string; expires_in_minutes: number }> {
    return this.authorizationCodeService.generateAuthorizationCode(
      dto,
      user.userId,
    );
  }

  @Post('validate')
  @Roles('USUARIO')
  @ApiOperation({
    summary: 'Validar código de autorización para proceder con eliminación',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de validación',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        authorization_id: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async validateCode(
    @Body() dto: ValidateAuthorizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    valid: boolean;
    authorization_id?: number;
    message: string;
  }> {
    const result =
      await this.authorizationCodeService.validateAuthorizationCode(
        dto,
        user.userId,
      );

    return {
      ...result,
      message: result.valid
        ? 'Código válido. Puede proceder con la eliminación.'
        : 'Código inválido o expirado.',
    };
  }

  @Get('check-needed/:recordId')
  @Roles('USUARIO')
  @ApiOperation({
    summary: 'Verificar si un registro necesita autorización para eliminar',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de autorización requerida',
    schema: {
      type: 'object',
      properties: {
        needs_authorization: { type: 'boolean' },
        message: { type: 'string' },
        days_since_creation: { type: 'number' },
      },
    },
  })
  async checkIfAuthorizationNeeded(
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    needs_authorization: boolean;
    message: string;
    days_since_creation?: number;
  }> {
    const record =
      await this.authorizationCodeService.checkRecordAuthorizationStatus(
        recordId,
        user.userId,
      );

    return record;
  }

  @Get('pending')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Obtener solicitudes pendientes (Solo Administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes',
    type: [AuthorizationRequestResponseDto],
  })
  async getPendingRequests(): Promise<AuthorizationRequestResponseDto[]> {
    return this.authorizationCodeService.getPendingRequests();
  }

  @Post('cleanup')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Limpiar códigos expirados (Solo Administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Códigos limpiados',
    schema: {
      type: 'object',
      properties: {
        cleaned_count: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async cleanupExpiredCodes(): Promise<{
    cleaned_count: number;
    message: string;
  }> {
    const count = await this.authorizationCodeService.cleanupExpiredCodes();
    return {
      cleaned_count: count,
      message: `Se limpiaron ${count} códigos expirados`,
    };
  }
}
