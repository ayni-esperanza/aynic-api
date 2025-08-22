import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, ILike, Between } from 'typeorm';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { PdfGeneratorService } from './services/pdf-generator.service';
import {
  ExpiredRecordsReportDto,
  ExpiredRecordCardData,
  ReportMetadata,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Genera reporte PDF de líneas de vida vencidas
   */
  async generateExpiredRecordsReport(
    filters: ExpiredRecordsReportDto,
    userId: number,
    username: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    totalRecords: number;
  }> {
    // Obtener líneas vencidas según filtros
    const expiredRecords = await this.getExpiredRecords(filters);

    if (expiredRecords.length === 0) {
      this.logger.warn('No se encontraron líneas vencidas para el reporte');
      // Aún generar PDF con mensaje "sin datos"
    }

    // Transformar datos para las tarjetas
    const cardData = this.transformToCardData(expiredRecords);

    // Preparar metadatos
    const metadata = this.buildReportMetadata(
      filters,
      expiredRecords.length,
      username,
    );

    // Generar PDF
    const buffer = await this.pdfGeneratorService.generateExpiredRecordsReport(
      cardData,
      metadata,
    );

    // Generar nombre de archivo
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:.]/g, '-');
    const filename = `lineas-vencidas-${timestamp}.pdf`;

    this.logger.log(
      `Reporte PDF generado: ${filename} (${expiredRecords.length} registros)`,
    );

    return {
      buffer,
      filename,
      totalRecords: expiredRecords.length,
    };
  }

  /**
   * Obtiene estadísticas rápidas de vencimientos
   */
  async getExpirationSummary(): Promise<{
    total_vencidas: number;
    vencidas_30_dias: number;
    vencidas_90_dias: number;
    vencidas_mas_90_dias: number;
    por_cliente: Array<{ cliente: string; count: number }>;
  }> {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // Total vencidas
    const totalVencidas = await this.recordRepository.count({
      where: {
        fecha_caducidad: LessThan(today),
        estado_actual: 'VENCIDO',
      },
    });

    // Vencidas en últimos 30 días
    const vencidas30 = await this.recordRepository.count({
      where: {
        fecha_caducidad: Between(thirtyDaysAgo, today),
        estado_actual: 'VENCIDO',
      },
    });

    // Vencidas entre 30-90 días
    const vencidas90 = await this.recordRepository.count({
      where: {
        fecha_caducidad: Between(ninetyDaysAgo, thirtyDaysAgo),
        estado_actual: 'VENCIDO',
      },
    });

    // Vencidas más de 90 días
    const vencidasMas90 = await this.recordRepository.count({
      where: {
        fecha_caducidad: LessThan(ninetyDaysAgo),
        estado_actual: 'VENCIDO',
      },
    });

    // Por cliente
    const porClienteQuery = await this.recordRepository
      .createQueryBuilder('record')
      .select('record.cliente', 'cliente')
      .addSelect('COUNT(*)', 'count')
      .where('record.fecha_caducidad < :today', { today })
      .andWhere('record.estado_actual = :estado', { estado: 'VENCIDO' })
      .andWhere('record.cliente IS NOT NULL')
      .groupBy('record.cliente')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const porCliente = porClienteQuery.map((item: any) => ({
      cliente: item.cliente,
      count: parseInt(item.count, 10),
    }));

    return {
      total_vencidas: totalVencidas,
      vencidas_30_dias: vencidas30,
      vencidas_90_dias: vencidas90,
      vencidas_mas_90_dias: vencidasMas90,
      por_cliente: porCliente,
    };
  }

  /**
   * Obtiene líneas vencidas según filtros
   */
  private async getExpiredRecords(
    filters: ExpiredRecordsReportDto,
  ): Promise<RecordEntity[]> {
    const today = new Date();
    const whereConditions: any = {
      fecha_caducidad: LessThan(today),
      estado_actual: 'VENCIDO',
    };

    // Aplicar filtros
    if (filters.cliente) {
      whereConditions.cliente = ILike(`%${filters.cliente}%`);
    }

    if (filters.ubicacion) {
      whereConditions.ubicacion = ILike(`%${filters.ubicacion}%`);
    }

    if (filters.codigo) {
      whereConditions.codigo = ILike(`%${filters.codigo}%`);
    }

    // Filtros de fecha de vencimiento
    if (filters.fecha_vencimiento_desde && filters.fecha_vencimiento_hasta) {
      whereConditions.fecha_caducidad = Between(
        new Date(filters.fecha_vencimiento_desde),
        new Date(filters.fecha_vencimiento_hasta),
      );
    } else if (filters.fecha_vencimiento_desde) {
      whereConditions.fecha_caducidad = Between(
        new Date(filters.fecha_vencimiento_desde),
        today,
      );
    } else if (filters.fecha_vencimiento_hasta) {
      // Mantener el filtro de "vencidas" pero hasta una fecha específica
      const fechaHasta = new Date(filters.fecha_vencimiento_hasta);
      if (fechaHasta < today) {
        whereConditions.fecha_caducidad = LessThan(fechaHasta);
      }
    }

    return await this.recordRepository.find({
      where: whereConditions,
      order: { fecha_caducidad: 'ASC' }, // Más antiguas primero
    });
  }

  /**
   * Transforma datos de entidad a formato de tarjeta
   */
  private transformToCardData(
    records: RecordEntity[],
  ): ExpiredRecordCardData[] {
    const today = new Date();

    return records.map((record) => {
      // Calcular días vencidos
      const diasVencido = Math.floor(
        (today.getTime() - record.fecha_caducidad.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        codigo: record.codigo,
        cliente: record.cliente || 'No especificado',
        ubicacion: record.ubicacion || 'No especificada',
        fecha_caducidad: record.fecha_caducidad,
        estado_actual: record.estado_actual || 'VENCIDO',
        dias_vencido: diasVencido,
        longitud: record.longitud,
        tipo_linea: record.tipo_linea,
        fecha_instalacion: record.fecha_instalacion,
      };
    });
  }

  /**
   * Construye metadatos del reporte
   */
  private buildReportMetadata(
    filters: ExpiredRecordsReportDto,
    totalRecords: number,
    username: string,
  ): ReportMetadata {
    const filtrosAplicados: string[] = [];

    if (filters.cliente) filtrosAplicados.push(`Cliente: ${filters.cliente}`);
    if (filters.ubicacion)
      filtrosAplicados.push(`Ubicación: ${filters.ubicacion}`);
    if (filters.codigo) filtrosAplicados.push(`Código: ${filters.codigo}`);
    if (filters.fecha_vencimiento_desde) {
      filtrosAplicados.push(`Desde: ${filters.fecha_vencimiento_desde}`);
    }
    if (filters.fecha_vencimiento_hasta) {
      filtrosAplicados.push(`Hasta: ${filters.fecha_vencimiento_hasta}`);
    }

    return {
      titulo: 'Reporte de Líneas de Vida Vencidas',
      fecha_generacion: new Date(),
      usuario_generador: username,
      total_registros: totalRecords,
      filtros_aplicados:
        filtrosAplicados.length > 0 ? filtrosAplicados : undefined,
    };
  }
}
