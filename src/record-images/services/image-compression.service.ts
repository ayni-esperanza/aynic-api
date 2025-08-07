import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
  quality: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxFileSize?: number; // en bytes
}

@Injectable()
export class ImageCompressionService {
  private readonly logger = new Logger(ImageCompressionService.name);

  // Configuración por defecto
  private readonly defaultOptions: CompressionOptions = {
    maxWidth: 1920, // Máximo ancho
    maxHeight: 1080, // Máximo alto
    quality: 85, // Calidad JPEG (1-100)
    format: 'jpeg', // Formato por defecto
    maxFileSize: 2 * 1024 * 1024, // 2MB máximo
  };

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Servicio de compresión de imágenes inicializado');
    this.logger.log(
      `Dimensiones máximas: ${this.defaultOptions.maxWidth}x${this.defaultOptions.maxHeight}`,
    );
    this.logger.log(`Calidad por defecto: ${this.defaultOptions.quality}%`);
    this.logger.log(
      `Tamaño máximo: ${(this.defaultOptions.maxFileSize! / 1024 / 1024).toFixed(1)}MB`,
    );
  }

  /**
   * Comprimir imagen automáticamente
   */
  async compressImage(
    file: Express.Multer.File,
    options?: Partial<CompressionOptions>,
  ): Promise<CompressionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const originalSize = file.buffer.length;

    try {
      // Obtener metadatos de la imagen original
      const metadata = await sharp(file.buffer).metadata();

      this.logger.debug(
        `Imagen original: ${metadata.width}x${metadata.height}, ${(originalSize / 1024).toFixed(1)}KB, formato: ${metadata.format}`,
      );

      // Decidir si necesita compresión
      const needsCompression = this.needsCompression(file, opts, metadata);

      let processedBuffer: Buffer;
      let finalQuality = opts.quality!;
      let finalWidth = metadata.width!;
      let finalHeight = metadata.height!;

      if (!needsCompression) {
        // No necesita compresión, usar archivo original
        processedBuffer = file.buffer;
        this.logger.debug('Imagen no requiere compresión');
      } else {
        // Aplicar compresión inteligente
        const result = await this.applySmartCompression(
          file.buffer,
          opts,
          metadata,
        );
        processedBuffer = result.buffer;
        finalQuality = result.quality;
        finalWidth = result.width;
        finalHeight = result.height;
      }

      const compressedSize = processedBuffer.length;
      const compressionRatio =
        ((originalSize - compressedSize) / originalSize) * 100;

      const result: CompressionResult = {
        buffer: processedBuffer,
        originalSize,
        compressedSize,
        compressionRatio,
        format: opts.format!,
        width: finalWidth,
        height: finalHeight,
        quality: finalQuality,
      };

      this.logger.log(
        `Compresión completada: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB` +
          ` (${compressionRatio.toFixed(1)}% reducción)`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error en compresión de imagen: ${error}`);
      throw new Error(`Error al comprimir imagen: ${error.message}`);
    }
  }

  /**
   * Compresión inteligente con múltiples pasadas
   */
  private async applySmartCompression(
    buffer: Buffer,
    options: CompressionOptions,
    metadata: sharp.Metadata,
  ): Promise<{
    buffer: Buffer;
    quality: number;
    width: number;
    height: number;
  }> {
    let sharpInstance = sharp(buffer);

    // 1. Redimensionar si es necesario
    const { newWidth, newHeight } = this.calculateOptimalDimensions(
      metadata.width!,
      metadata.height!,
      options.maxWidth!,
      options.maxHeight!,
    );

    if (newWidth !== metadata.width || newHeight !== metadata.height) {
      sharpInstance = sharpInstance.resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      this.logger.debug(
        `Redimensionando: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight}`,
      );
    }

    // 2. Aplicar compresión progresiva por calidad
    let currentQuality = options.quality!;
    let resultBuffer: Buffer;

    do {
      if (options.format === 'jpeg') {
        resultBuffer = await sharpInstance
          .jpeg({
            quality: currentQuality,
            progressive: true,
            mozjpeg: true, // Mejor compresión
          })
          .toBuffer();
      } else if (options.format === 'png') {
        resultBuffer = await sharpInstance
          .png({
            compressionLevel: 9,
            progressive: true,
            palette: currentQuality < 90, // Usar paleta para mayor compresión
          })
          .toBuffer();
      } else if (options.format === 'webp') {
        resultBuffer = await sharpInstance
          .webp({
            quality: currentQuality,
            effort: 6, // Máximo esfuerzo de compresión
          })
          .toBuffer();
      } else {
        resultBuffer = await sharpInstance.toBuffer();
      }

      // Si el archivo sigue siendo muy grande, reducir calidad
      if (resultBuffer.length > options.maxFileSize! && currentQuality > 60) {
        currentQuality -= 10;
        this.logger.debug(
          `Reduciendo calidad a ${currentQuality}% (${(resultBuffer.length / 1024).toFixed(1)}KB)`,
        );
      } else {
        break;
      }
    } while (currentQuality >= 60);

    // 3. Si aún es muy grande, redimensionar más agresivamente
    if (resultBuffer.length > options.maxFileSize!) {
      const scaleFactor = Math.sqrt(options.maxFileSize! / resultBuffer.length);
      const ultraCompressedWidth = Math.floor(newWidth * scaleFactor);
      const ultraCompressedHeight = Math.floor(newHeight * scaleFactor);

      this.logger.debug(
        `Compresión ultra-agresiva: ${ultraCompressedWidth}x${ultraCompressedHeight}`,
      );

      resultBuffer = await sharp(buffer)
        .resize(ultraCompressedWidth, ultraCompressedHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 75,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        buffer: resultBuffer,
        quality: 75,
        width: ultraCompressedWidth,
        height: ultraCompressedHeight,
      };
    }

    return {
      buffer: resultBuffer,
      quality: currentQuality,
      width: newWidth,
      height: newHeight,
    };
  }

  /**
   * Determinar si la imagen necesita compresión
   */
  private needsCompression(
    file: Express.Multer.File,
    options: CompressionOptions,
    metadata: sharp.Metadata,
  ): boolean {
    const originalSize = file.buffer.length;
    const maxFileSize = options.maxFileSize!;
    const maxWidth = options.maxWidth!;
    const maxHeight = options.maxHeight!;

    // Necesita compresión si:
    // 1. El archivo es muy grande
    if (originalSize > maxFileSize) {
      this.logger.debug(
        `Archivo muy grande: ${(originalSize / 1024).toFixed(1)}KB > ${(maxFileSize / 1024).toFixed(1)}KB`,
      );
      return true;
    }

    // 2. Las dimensiones son muy grandes
    if (metadata.width! > maxWidth || metadata.height! > maxHeight) {
      this.logger.debug(
        `Dimensiones muy grandes: ${metadata.width}x${metadata.height} > ${maxWidth}x${maxHeight}`,
      );
      return true;
    }

    // 3. Es PNG y podría beneficiarse de conversión a JPEG
    if (metadata.format === 'png' && originalSize > 500 * 1024) {
      // PNG > 500KB
      this.logger.debug(`PNG grande que podría optimizarse como JPEG`);
      return true;
    }

    return false;
  }

  /**
   * Calcular dimensiones óptimas manteniendo aspect ratio
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { newWidth: number; newHeight: number } {
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Si es más ancho que el máximo
    if (originalWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round(maxWidth / aspectRatio);
    }

    // Si después del ajuste de ancho, la altura sigue siendo muy grande
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = Math.round(maxHeight * aspectRatio);
    }

    return { newWidth, newHeight };
  }

  /**
   * Obtener información de una imagen sin procesarla
   */
  async getImageInfo(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    channels: number;
    density?: number;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width!,
        height: metadata.height!,
        format: metadata.format!,
        size: buffer.length,
        channels: metadata.channels!,
        density: metadata.density,
      };
    } catch (error) {
      throw new Error(
        `Error al obtener información de imagen: ${error.message}`,
      );
    }
  }

  /**
   * Generar múltiples tamaños de imagen (thumbnails)
   */
  async generateThumbnails(
    buffer: Buffer,
    sizes: Array<{ width: number; height: number; suffix: string }>,
  ): Promise<
    Array<{ buffer: Buffer; size: string; width: number; height: number }>
  > {
    const thumbnails: Array<{
      buffer: Buffer;
      size: string;
      width: number;
      height: number;
    }> = [];

    for (const size of sizes) {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 85,
            progressive: true,
          })
          .toBuffer();

        thumbnails.push({
          buffer: thumbnailBuffer,
          size: size.suffix,
          width: size.width,
          height: size.height,
        });

        this.logger.debug(
          `Thumbnail ${size.suffix} generado: ${size.width}x${size.height}`,
        );
      } catch (error) {
        this.logger.error(
          `Error generando thumbnail ${size.suffix}: ${error}`,
        );
      }
    }

    return thumbnails;
  }

  /**
   * Optimizar imagen para web
   */
  async optimizeForWeb(buffer: Buffer): Promise<{
    jpeg: Buffer;
    webp: Buffer;
    originalSize: number;
    jpegSize: number;
    webpSize: number;
  }> {
    const originalSize = buffer.length;

    // Versión JPEG optimizada
    const jpegBuffer = await sharp(buffer)
      .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    // Versión WebP optimizada
    const webpBuffer = await sharp(buffer)
      .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({
        quality: 80,
        effort: 6,
      })
      .toBuffer();

    return {
      jpeg: jpegBuffer,
      webp: webpBuffer,
      originalSize,
      jpegSize: jpegBuffer.length,
      webpSize: webpBuffer.length,
    };
  }
}
