import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceDto,
  MaintenanceResponseDto,
} from './dto/maintenance.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';
import { multerConfig } from '../record-images/config/multer.config';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Registrar mantenimiento de línea de vida' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        record_id: {
          type: 'number',
          description: 'ID de la línea de vida',
          example: 1,
        },
        maintenance_date: {
          type: 'string',
          format: 'date',
          description: 'Fecha del mantenimiento (YYYY-MM-DD)',
          example: '2024-01-15',
        },
        new_length_meters: {
          type: 'number',
          description: 'Nueva longitud en metros (opcional)',
          example: 15.5,
        },
        description: {
          type: 'string',
          description: 'Descripción del mantenimiento',
          example: 'Revisión y limpieza de anclajes',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Fotografía del mantenimiento (JPG, PNG)',
        },
      },
      required: ['record_id', 'maintenance_date'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mantenimiento registrado exitosamente',
    type: MaintenanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Línea de vida no encontrada' })
  @ApiResponse({ status: 400, description: 'Fecha de mantenimiento inválida' })
  async create(
    @Body() createMaintenanceDto: CreateMaintenanceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.create(
      createMaintenanceDto,
      file,
      user.userId,
    );
  }

  @Get('by-record/:recordId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener historial de mantenimientos de una línea de vida',
  })
  @ApiParam({ name: 'recordId', description: 'ID de la línea de vida' })
  @ApiResponse({
    status: 200,
    description: 'Historial de mantenimientos obtenido exitosamente',
    type: [MaintenanceResponseDto],
  })
  getMaintenancesByRecord(
    @Param('recordId', ParseIntPipe) recordId: number,
  ): Promise<MaintenanceResponseDto[]> {
    return this.maintenanceService.findByRecord(recordId);
  }

  @Get(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener un mantenimiento por ID' })
  @ApiParam({ name: 'id', description: 'ID del mantenimiento' })
  @ApiResponse({
    status: 200,
    description: 'Mantenimiento encontrado',
    type: MaintenanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Mantenimiento no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.findOne(id);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un mantenimiento (Solo Administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID del mantenimiento' })
  @ApiResponse({
    status: 204,
    description: 'Mantenimiento eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Mantenimiento no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.maintenanceService.remove(id);
  }
}
