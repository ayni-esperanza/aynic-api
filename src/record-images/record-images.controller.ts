import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
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
import { RecordImagesService } from './record-images.service';
import {
  UploadImageDto,
  ImageResponseDto,
  UpdateImageDto,
} from './dto/image.dto';
import { Req } from '@nestjs/common';
import { TrackingInterceptor } from '../record-movement-history/tracking.interceptor';
import { TrackingContext } from '../record-movement-history/movement-tracking.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';
import { multerConfig } from './config/multer.config';

@ApiTags('record-images')
@Controller('records/:recordId/image')
@UseGuards(SessionAuthGuard, RolesGuard)
@UseInterceptors(TrackingInterceptor)
@ApiBearerAuth()
export class RecordImagesController {
  constructor(private readonly recordImagesService: RecordImagesService) {}

  // Método helper para extraer contexto de tracking
  private getTrackingContext(request: any, user: any): TrackingContext {
    return {
      userId: user?.userId,
      username: user?.username,
      ipAddress: request?.trackingContext?.ipAddress,
      userAgent: request?.trackingContext?.userAgent,
    };
  }

  @Post('upload')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Subir imagen para un record' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPG, PNG, JPEG)',
        },
        description: {
          type: 'string',
          description: 'Descripción opcional de la imagen',
          maxLength: 500,
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 409, description: 'El record ya tiene una imagen' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o muy grande' })
  @ApiResponse({ status: 404, description: 'Record no encontrado' })
  async uploadImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any,
  ): Promise<ImageResponseDto> {
    const trackingContext = this.getTrackingContext(request, user);
    return this.recordImagesService.uploadImage(
      recordId,
      file,
      uploadImageDto,
      user.userId,
      trackingContext,
    );
  }

  @Post('replace')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Reemplazar imagen existente de un record' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Nueva imagen (JPG, PNG, JPEG)',
        },
        description: {
          type: 'string',
          description: 'Descripción opcional de la imagen',
          maxLength: 500,
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen reemplazada exitosamente',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido o muy grande' })
  @ApiResponse({ status: 404, description: 'Record no encontrado' })
  async replaceImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any,
  ): Promise<ImageResponseDto> {
    const trackingContext = this.getTrackingContext(request, user);
    return this.recordImagesService.replaceRecordImage(
      recordId,
      file,
      uploadImageDto,
      user.userId,
      trackingContext,
    );
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Obtener imagen de un record' })
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiResponse({
    status: 200,
    description: 'Imagen encontrada',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Record o imagen no encontrada' })
  async getRecordImage(
    @Param('recordId', ParseIntPipe) recordId: number,
  ): Promise<ImageResponseDto | null> {
    return this.recordImagesService.getRecordImage(recordId);
  }

  @Patch('metadata')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Actualizar metadatos de la imagen' })
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiResponse({
    status: 200,
    description: 'Metadatos actualizados exitosamente',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  async updateImageMetadata(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() updateImageDto: UpdateImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImageResponseDto> {
    return this.recordImagesService.updateImageMetadata(
      recordId,
      updateImageDto,
      user.userId,
    );
  }

  @Delete()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar imagen de un record' })
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiResponse({ status: 204, description: 'Imagen eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  async deleteRecordImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any, // NUEVO
  ): Promise<void> {
    const trackingContext = this.getTrackingContext(request, user);
    await this.recordImagesService.deleteRecordImage(
      recordId,
      user.userId,
      trackingContext,
    );
  }

  @Get('exists')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({ summary: 'Verificar si un record tiene imagen' })
  @ApiParam({ name: 'recordId', description: 'ID del record' })
  @ApiResponse({ status: 200, description: 'Estado de imagen verificado' })
  async hasImage(
    @Param('recordId', ParseIntPipe) recordId: number,
  ): Promise<{ hasImage: boolean }> {
    const hasImage = await this.recordImagesService.hasImage(recordId);
    return { hasImage };
  }
}

// Controlador adicional para administración de imágenes
@ApiTags('admin-images')
@Controller('admin/images')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminImagesController {
  constructor(private readonly recordImagesService: RecordImagesService) {}

  @Get('clamav/status')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Verificar estado del servicio antivirus ClamAV' })
  @ApiResponse({
    status: 200,
    description: 'Estado del servicio antivirus',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        version: { type: 'string' },
        ping: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio antivirus no disponible',
  })
  async getClamavStatus() {
    return this.recordImagesService.getClamavStatus();
  }

  @Get('all')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'Obtener todas las imágenes (Solo Administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las imágenes',
    type: [ImageResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async getAllImages(): Promise<ImageResponseDto[]> {
    return this.recordImagesService.getAllImages();
  }

  @Get('statistics')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener estadísticas de imágenes con compresión' })
  @ApiResponse({
    status: 200,
    description:
      'Estadísticas de imágenes incluyendo información de compresión',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        totalSize: { type: 'number' },
        totalOriginalSize: { type: 'number' },
        totalSavings: { type: 'number' },
        averageCompressionRatio: { type: 'number' },
        byMimeType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mime_type: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getImageStatistics() {
    const stats = await this.recordImagesService.getImageStatistics();

    return {
      ...stats,
      totalSizeFormatted: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
      totalOriginalSizeFormatted: `${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
      totalSavingsFormatted: `${(stats.totalSavings / 1024 / 1024).toFixed(2)} MB`,
      averageCompressionRatioFormatted: `${stats.averageCompressionRatio.toFixed(1)}%`,
    };
  }

  @Delete('cleanup-orphans')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Limpiar imágenes huérfanas - Mantenimiento (Solo Administradores)',
  })
  @ApiResponse({ status: 200, description: 'Limpieza completada exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requiere rol de administrador',
  })
  async cleanOrphanImages() {
    const result = await this.recordImagesService.cleanOrphanImages();
    return {
      message: `Se eliminaron ${result.deletedCount} imágenes huérfanas`,
      ...result,
    };
  }
}
