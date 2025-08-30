import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ExpiredRecordsReportDto } from './dto/reports.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';

@ApiTags('reports')
@Controller('reports')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('expired-records/pdf')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary:
      'Generar reporte PDF de líneas de vida vencidas en formato tarjetas',
  })
  @ApiQuery({
    name: 'cliente',
    required: false,
    description: 'Filtrar por cliente (parcial)',
  })
  @ApiQuery({
    name: 'ubicacion',
    required: false,
    description: 'Filtrar por ubicación (parcial)',
  })
  @ApiQuery({
    name: 'codigo',
    required: false,
    description: 'Filtrar por código (parcial)',
  })
  @ApiQuery({
    name: 'fecha_vencimiento_desde',
    required: false,
    description: 'Fecha de vencimiento desde (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_vencimiento_hasta',
    required: false,
    description: 'Fecha de vencimiento hasta (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte PDF generado y descargado exitosamente',
    headers: {
      'Content-Type': {
        description: 'Tipo de contenido del archivo',
        schema: { type: 'string', example: 'application/pdf' },
      },
      'Content-Disposition': {
        description: 'Disposición del contenido para descarga',
        schema: {
          type: 'string',
          example: 'attachment; filename="reporte.pdf"',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron líneas vencidas (aún se genera PDF vacío)',
  })
  async generateExpiredRecordsReport(
    @Query() filters: ExpiredRecordsReportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { buffer, filename, totalRecords } =
        await this.reportsService.generateExpiredRecordsReport(
          filters,
          user.userId,
          user.username,
        );

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Headers personalizados para información adicional
      res.setHeader('X-Report-Records', totalRecords.toString());
      res.setHeader('X-Report-Type', 'expired-records');
      res.setHeader('X-Generated-At', new Date().toISOString());

      // Enviar PDF
      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      // En caso de error, enviar respuesta JSON
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Error generando reporte PDF',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('expired-records/summary')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener resumen ejecutivo de líneas vencidas',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de vencimientos obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        total_vencidas: { type: 'number' },
        vencidas_30_dias: { type: 'number' },
        vencidas_90_dias: { type: 'number' },
        vencidas_mas_90_dias: { type: 'number' },
        por_cliente: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cliente: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getExpirationSummary() {
    return this.reportsService.getExpirationSummary();
  }

  @Get('expired-records/preview')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Vista previa de datos para reporte (sin generar PDF)',
  })
  @ApiQuery({
    name: 'cliente',
    required: false,
    description: 'Filtrar por cliente (parcial)',
  })
  @ApiQuery({
    name: 'ubicacion',
    required: false,
    description: 'Filtrar por ubicación (parcial)',
  })
  @ApiQuery({
    name: 'codigo',
    required: false,
    description: 'Filtrar por código (parcial)',
  })
  @ApiQuery({
    name: 'fecha_vencimiento_desde',
    required: false,
    description: 'Fecha de vencimiento desde (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fecha_vencimiento_hasta',
    required: false,
    description: 'Fecha de vencimiento hasta (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vista previa generada exitosamente',
    schema: {
      type: 'object',
      properties: {
        total_records: { type: 'number' },
        preview_records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              codigo: { type: 'string' },
              cliente: { type: 'string' },
              ubicacion: { type: 'string' },
              fecha_caducidad: { type: 'string' },
              dias_vencido: { type: 'number' },
            },
          },
        },
        applied_filters: { type: 'array', items: { type: 'string' } },
        can_generate_report: { type: 'boolean' },
      },
    },
  })
  async previewExpiredRecords(
    @Query() filters: ExpiredRecordsReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Esta función permitiría ver qué datos se incluirían en el reporte
    // sin generar el PDF completo
    return {
      message: 'Vista previa no implementada aún',
      note: 'Use el endpoint /pdf para generar el reporte completo',
    };
  }
}
