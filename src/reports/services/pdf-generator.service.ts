import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import { ExpiredRecordCardData, ReportMetadata } from '../dto/reports.dto';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Genera PDF de líneas vencidas en formato tarjetas
   */
  async generateExpiredRecordsReport(
    records: ExpiredRecordCardData[],
    metadata: ReportMetadata,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Crear documento PDF
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: metadata.titulo,
            Author: 'Sistema Ayni',
            Subject: 'Reporte de Líneas de Vida Vencidas',
            CreationDate: metadata.fecha_generacion,
          },
        });

        // Buffer para almacenar el PDF
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Configurar estilos y colores
        const colors = {
          primary: '#2563eb',
          secondary: '#64748b',
          danger: '#dc2626',
          background: '#f8fafc',
          text: '#1e293b',
          border: '#e2e8f0',
        };

        // Generar contenido del PDF
        this.generateHeader(doc, metadata, colors);
        this.generateSummary(doc, records.length, metadata, colors);

        if (records.length > 0) {
          this.generateCards(doc, records, colors);
        } else {
          this.generateNoDataMessage(doc, colors);
        }

        this.generateFooter(doc, metadata, colors);

        // Finalizar documento
        doc.end();
      } catch (error) {
        this.logger.error('Error generando PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Genera el encabezado del reporte
   */
  private generateHeader(
    doc: PDFKit.PDFDocument,
    metadata: ReportMetadata,
    colors: any,
  ): void {
    // Logo/título de empresa (placeholder)
    doc
      .fontSize(24)
      .fillColor(colors.primary)
      .text('AYNI', 50, 50, { align: 'left' })
      .fontSize(12)
      .fillColor(colors.secondary)
      .text('Sistema de Gestión de Líneas de Vida', 50, 80);

    // Título del reporte
    doc
      .fontSize(18)
      .fillColor(colors.text)
      .text(metadata.titulo, 50, 120, { align: 'center' });

    // Línea separadora
    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(50, 150)
      .lineTo(550, 150)
      .stroke();
  }

  /**
   * Genera resumen ejecutivo
   */
  private generateSummary(
    doc: PDFKit.PDFDocument,
    totalRecords: number,
    metadata: ReportMetadata,
    colors: any,
  ): void {
    const y = 170;

    // Información de generación
    doc
      .fontSize(10)
      .fillColor(colors.secondary)
      .text(
        `Fecha de generación: ${metadata.fecha_generacion.toLocaleDateString('es-PE')}`,
        50,
        y,
      )
      .text(`Generado por: ${metadata.usuario_generador}`, 300, y)
      .text(`Total de líneas vencidas: ${totalRecords}`, 50, y + 15);

    // Filtros aplicados
    if (metadata.filtros_aplicados && metadata.filtros_aplicados.length > 0) {
      doc
        .text('Filtros aplicados: ', 50, y + 30)
        .text(metadata.filtros_aplicados.join(', '), 150, y + 30);
    }
  }

  /**
   * Genera las tarjetas de líneas vencidas
   */
  private generateCards(
    doc: PDFKit.PDFDocument,
    records: ExpiredRecordCardData[],
    colors: any,
  ): void {
    let currentY = 240;
    const cardWidth = 240;
    const cardHeight = 120;
    const cardsPerRow = 2;
    const cardMargin = 20;

    records.forEach((record, index) => {
      // Calcular posición de la tarjeta
      const col = index % cardsPerRow;
      const row = Math.floor(index / cardsPerRow);

      const x = 50 + col * (cardWidth + cardMargin);
      const y = currentY + row * (cardHeight + cardMargin);

      // Verificar si necesita nueva página
      if (y + cardHeight > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
        const newRow = Math.floor(index / cardsPerRow);
        const adjustedY =
          50 +
          (newRow %
            Math.floor((doc.page.height - 150) / (cardHeight + cardMargin))) *
            (cardHeight + cardMargin);
        this.drawCard(doc, record, x, adjustedY, cardWidth, cardHeight, colors);
      } else {
        this.drawCard(doc, record, x, y, cardWidth, cardHeight, colors);
      }
    });
  }

  /**
   * Dibuja una tarjeta individual
   */
  private drawCard(
    doc: PDFKit.PDFDocument,
    record: ExpiredRecordCardData,
    x: number,
    y: number,
    width: number,
    height: number,
    colors: any,
  ): void {
    // Fondo de la tarjeta
    doc
      .rect(x, y, width, height)
      .fillColor(colors.background)
      .fill()
      .rect(x, y, width, height)
      .strokeColor(colors.border)
      .stroke();

    // Header de la tarjeta con estado
    const statusColor = this.getStatusColor(record.dias_vencido, colors);
    doc.rect(x, y, width, 25).fillColor(statusColor).fill();

    // Código de la línea (principal)
    doc
      .fontSize(12)
      .fillColor('white')
      .text(record.codigo, x + 10, y + 7, { width: width - 20, align: 'left' });

    // Estado y días vencidos
    doc
      .fontSize(8)
      .fillColor('white')
      .text(`${record.dias_vencido} días vencida`, x + 10, y + height - 20, {
        width: width - 20,
        align: 'right',
      });

    // Contenido de la tarjeta
    const contentY = y + 35;
    doc.fontSize(9).fillColor(colors.text);

    // Cliente/Empresa
    doc
      .font('Helvetica-Bold')
      .text('Cliente:', x + 10, contentY)
      .font('Helvetica')
      .text(this.truncateText(record.cliente || 'N/A', 25), x + 50, contentY);

    // Ubicación
    doc
      .font('Helvetica-Bold')
      .text('Ubicación:', x + 10, contentY + 15)
      .font('Helvetica')
      .text(
        this.truncateText(record.ubicacion || 'N/A', 25),
        x + 60,
        contentY + 15,
      );

    // Fecha de vencimiento
    doc
      .font('Helvetica-Bold')
      .text('Vencimiento:', x + 10, contentY + 30)
      .font('Helvetica')
      .text(
        record.fecha_caducidad.toLocaleDateString('es-PE'),
        x + 70,
        contentY + 30,
      );

    // Información adicional si hay espacio
    if (record.longitud) {
      doc
        .font('Helvetica-Bold')
        .text('Longitud:', x + 10, contentY + 45)
        .font('Helvetica')
        .text(`${record.longitud}m`, x + 55, contentY + 45);
    }

    if (record.tipo_linea) {
      doc
        .font('Helvetica-Bold')
        .text('Tipo:', x + 120, contentY + 45)
        .font('Helvetica')
        .text(this.truncateText(record.tipo_linea, 12), x + 145, contentY + 45);
    }
  }

  /**
   * Genera mensaje cuando no hay datos
   */
  private generateNoDataMessage(doc: PDFKit.PDFDocument, colors: any): void {
    const y = 300;

    doc
      .fontSize(14)
      .fillColor(colors.secondary)
      .text('No se encontraron líneas de vida vencidas', 50, y, {
        align: 'center',
        width: 500,
      })
      .fontSize(12)
      .text('Con los filtros aplicados no hay datos para mostrar', 50, y + 25, {
        align: 'center',
        width: 500,
      });
  }

  /**
   * Genera el pie de página
   */
  private generateFooter(
    doc: PDFKit.PDFDocument,
    metadata: ReportMetadata,
    colors: any,
  ): void {
    // Ir a la última página
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Línea separadora
      doc
        .strokeColor(colors.border)
        .lineWidth(0.5)
        .moveTo(50, doc.page.height - 60)
        .lineTo(550, doc.page.height - 60)
        .stroke();

      // Información del pie
      doc
        .fontSize(8)
        .fillColor(colors.secondary)
        .text(
          `Sistema Ayni - Reporte generado el ${metadata.fecha_generacion.toLocaleString('es-PE')}`,
          50,
          doc.page.height - 45,
          { align: 'left' },
        )
        .text(`Página ${i + 1} de ${pages.count}`, 50, doc.page.height - 45, {
          align: 'right',
          width: 500,
        });
    }
  }

  /**
   * Determina color según días vencidos
   */
  private getStatusColor(diasVencido: number, colors: any): string {
    if (diasVencido <= 30) return colors.danger;
    if (diasVencido <= 90) return '#ea580c'; // orange-600
    return '#7c2d12'; // red-900
  }

  /**
   * Trunca texto si es muy largo
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
