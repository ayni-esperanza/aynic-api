import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  ImageCompressionService,
  CompressionResult,
} from './image-compression.service';

export interface UploadResult {
  key: string;
  filename: string;
  publicUrl: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
  quality: number;
  format: string;
}

export interface R2FileMetadata {
  size: number;
  lastModified: Date;
  contentType: string;
  metadata: Record<string, string>;
  compression: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
    quality: number;
  };
  cacheControl?: string;
  contentEncoding?: string;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly compressionEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly compressionService: ImageCompressionService,
  ) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';
    this.compressionEnabled =
      this.configService.get<string>('COMPRESSION_ENABLED') === 'true';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.error('Credenciales de R2 no configuradas correctamente');
      throw new Error('R2 credentials not configured');
    }

    // Configurar cliente S3 compatible para R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`R2 Service inicializado`);
    this.logger.log(`Bucket: ${this.bucketName}`);
    this.logger.log(`URL pública: ${this.publicUrl || 'No configurada'}`);
    this.logger.log(
      `Compresión: ${this.compressionEnabled ? 'HABILITADA' : 'DESHABILITADA'}`,
    );
  }

  /**
   * Subir archivo a R2 con compresión automática
   */
  async uploadFile(
    file: Express.Multer.File,
    recordId: number,
    userId?: number,
  ): Promise<UploadResult> {
    try {
      const originalSize = file.buffer.length;

      this.logger.debug(
        `Iniciando upload para record ${recordId}: ${file.originalname} (${(originalSize / 1024).toFixed(1)}KB)`,
      );

      // Validar archivo original
      this.validateFile(file);

      let finalBuffer = file.buffer;
      let compressionResult: CompressionResult | null = null;
      let finalFormat =
        this.getFileExtension(file.originalname).replace('.', '') || 'jpg';

      // Aplicar compresión si está habilitada
      if (this.compressionEnabled) {
        this.logger.debug(
          `Comprimiendo imagen: ${(originalSize / 1024).toFixed(1)}KB`,
        );

        compressionResult = await this.compressionService.compressImage(file, {
          maxWidth: Number(this.configService.get('MAX_IMAGE_WIDTH')) || 1920,
          maxHeight: Number(this.configService.get('MAX_IMAGE_HEIGHT')) || 1080,
          quality: Number(this.configService.get('DEFAULT_QUALITY')) || 85,
          format:
            (this.configService.get('DEFAULT_FORMAT') as
              | 'jpeg'
              | 'png'
              | 'webp') || 'jpeg',
          maxFileSize:
            Number(this.configService.get('MAX_COMPRESSED_SIZE')) || 2097152,
        });

        finalBuffer = compressionResult.buffer;
        finalFormat = compressionResult.format;

        this.logger.log(
          `Compresión exitosa: ${(originalSize / 1024).toFixed(1)}KB → ${(finalBuffer.length / 1024).toFixed(1)}KB ` +
            `(${compressionResult.compressionRatio.toFixed(1)}% reducción, ${finalFormat.toUpperCase()}, ` +
            `${compressionResult.width}x${compressionResult.height}, Q${compressionResult.quality})`,
        );
      } else {
        this.logger.debug(
          'Compresión deshabilitada, usando archivo original',
        );
      }

      // Generar nombre único para el archivo
      const fileExtension = `.${finalFormat}`;
      const filename = `${uuidv4()}${fileExtension}`;
      const key = `records/${recordId}/${filename}`;

      // Determinar Content-Type correcto
      const contentType = `image/${finalFormat}`;

      // Preparar metadatos extendidos
      const metadata = {
        // Información básica
        originalName: file.originalname,
        originalMimeType: file.mimetype,
        recordId: recordId.toString(),
        uploadedBy: userId?.toString() || 'unknown',
        uploadDate: new Date().toISOString(),

        // Información de compresión
        originalSize: originalSize.toString(),
        compressedSize: finalBuffer.length.toString(),
        compressionRatio: compressionResult?.compressionRatio.toString() || '0',
        compressionEnabled: this.compressionEnabled.toString(),

        // Información de imagen
        width: compressionResult?.width.toString() || 'unknown',
        height: compressionResult?.height.toString() || 'unknown',
        quality: compressionResult?.quality.toString() || '100',
        finalFormat,

        // Información técnica
        nodeVersion: process.version,
        uploadMethod: 'sharp-compression',
      };

      // Comando para subir archivo comprimido
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: finalBuffer,
        ContentType: contentType,
        Metadata: metadata,

        // Optimizaciones de cache y transferencia
        CacheControl: 'public, max-age=31536000, immutable', // 1 año, inmutable
        ContentDisposition: `inline; filename="${encodeURIComponent(file.originalname)}"`,

        // Headers adicionales para optimización
        ...(this.compressionEnabled && {
          ContentEncoding: 'identity', // No usar encoding adicional ya que la imagen está optimizada
        }),
      });

      // Ejecutar upload
      const uploadStart = Date.now();
      await this.s3Client.send(uploadCommand);
      const uploadDuration = Date.now() - uploadStart;

      // Generar URL pública o firmada
      const publicUrl = this.publicUrl
        ? `${this.publicUrl}/${key}`
        : await this.getSignedDownloadUrl(key);

      this.logger.log(
        `Upload completado en ${uploadDuration}ms: ${key} ` +
          `(${(finalBuffer.length / 1024).toFixed(1)}KB, ${finalFormat.toUpperCase()})`,
      );

      return {
        key,
        filename,
        publicUrl,
        size: finalBuffer.length,
        originalSize,
        compressionRatio: compressionResult?.compressionRatio || 0,
        dimensions: {
          width: compressionResult?.width || 0,
          height: compressionResult?.height || 0,
        },
        quality: compressionResult?.quality || 100,
        format: finalFormat,
      };
    } catch (error) {
      this.logger.error(
        `Error al subir archivo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtener URL firmada para descarga (válida por 1 hora)
   */
  async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.debug(
        `URL firmada generada para ${key} (expira en ${expiresIn}s)`,
      );
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Error al generar URL firmada para ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtener URL firmada para descarga directa (forzar download)
   */
  async getSignedDownloadUrlForceDownload(
    key: string,
    filename?: string,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${filename || key.split('/').pop()}"`,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hora
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Error al generar URL de descarga: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Eliminar archivo de R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);
      this.logger.log(`Archivo eliminado: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar archivo ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Eliminar múltiples archivos
   */
  async deleteMultipleFiles(
    keys: string[],
  ): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        deleted.push(key);
      } catch (error) {
        this.logger.error(`Error eliminando ${key}: ${error.message}`);
        failed.push(key);
      }
    }

    this.logger.log(
      `Eliminación múltiple: ${deleted.length} exitosos, ${failed.length} fallos`,
    );

    return { deleted, failed };
  }

  /**
   * Verificar si existe un archivo
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener metadatos de un archivo con información de compresión
   */
  async getFileMetadata(key: string): Promise<R2FileMetadata> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(headCommand);

      // Extraer metadatos de compresión
      const compressionInfo = {
        originalSize: parseInt(response.Metadata?.originalSize || '0'),
        compressedSize: parseInt(response.Metadata?.compressedSize || '0'),
        compressionRatio: parseFloat(
          response.Metadata?.compressionRatio || '0',
        ),
        width: parseInt(response.Metadata?.width || '0'),
        height: parseInt(response.Metadata?.height || '0'),
        quality: parseInt(response.Metadata?.quality || '100'),
      };

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
        compression: compressionInfo,
        cacheControl: response.CacheControl,
        contentEncoding: response.ContentEncoding,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener metadatos de ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Listar archivos en el bucket con filtros
   */
  async listFiles(
    prefix?: string,
    maxKeys: number = 1000,
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>
  > {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map((obj) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag || '',
      }));
    } catch (error) {
      this.logger.error(`Error listando archivos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del bucket
   */
  async getBucketStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByPrefix: Record<string, number>;
    compressionStats: {
      totalOriginalSize: number;
      totalCompressedSize: number;
      totalSavings: number;
      averageCompressionRatio: number;
    };
  }> {
    try {
      const files = await this.listFiles();

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      // Agrupar por prefijo (carpeta)
      const filesByPrefix: Record<string, number> = {};
      files.forEach((file) => {
        const prefix = file.key.split('/')[0] || 'root';
        filesByPrefix[prefix] = (filesByPrefix[prefix] || 0) + 1;
      });

      // Obtener estadísticas de compresión
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      let totalCompressionRatio = 0;
      let filesWithCompression = 0;

      if (files.length <= 100) {
        // Solo para un número razonable de archivos
        for (const file of files) {
          try {
            const metadata = await this.getFileMetadata(file.key);
            if (metadata.compression.originalSize > 0) {
              totalOriginalSize += metadata.compression.originalSize;
              totalCompressedSize += metadata.compression.compressedSize;
              totalCompressionRatio += metadata.compression.compressionRatio;
              filesWithCompression++;
            }
          } catch (error) {
            this.logger.warn(`No se pudieron obtener metadatos para ${file.key}: ${error.message}`);
          }
        }
      }

      const compressionStats = {
        totalOriginalSize,
        totalCompressedSize,
        totalSavings: totalOriginalSize - totalCompressedSize,
        averageCompressionRatio:
          filesWithCompression > 0
            ? totalCompressionRatio / filesWithCompression
            : 0,
      };

      this.logger.log(
        `Estadísticas del bucket: ${totalFiles} archivos, ${(totalSize / 1024 / 1024).toFixed(2)}MB total`,
      );

      return {
        totalFiles,
        totalSize,
        averageFileSize,
        filesByPrefix,
        compressionStats,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo estadísticas del bucket: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validar archivo antes de subir (validación más permisiva para compresión)
   */
  private validateFile(file: Express.Multer.File): void {
    // Tamaño máximo más alto porque después se comprimirá
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760; // 10MB default
    const allowedTypes = this.configService
      .get<string>('ALLOWED_FILE_TYPES')
      ?.split(',') || ['image/jpeg', 'image/jpg', 'image/png'];

    // Validar tamaño (más permisivo porque se comprimirá)
    if (file.size > maxSize) {
      throw new Error(
        `Archivo muy grande. Máximo permitido: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
      );
    }

    // Validar tipo de archivo
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`,
      );
    }

    // Validar que el buffer no esté vacío
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Archivo vacío o corrupto');
    }

    // Validar nombre de archivo
    if (!file.originalname || file.originalname.length > 255) {
      throw new Error('Nombre de archivo inválido o muy largo');
    }
  }

  /**
   * Obtener extensión de archivo
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Generar URL pública 
   */
  getPublicUrl(key: string): string | null {
    return this.publicUrl ? `${this.publicUrl}/${key}` : null;
  }

  /**
   * Obtener información del servicio
   */
  getServiceInfo(): {
    bucketName: string;
    hasPublicUrl: boolean;
    compressionEnabled: boolean;
    maxFileSize: number;
    maxCompressedSize: number;
    allowedTypes: string[];
  } {
    return {
      bucketName: this.bucketName,
      hasPublicUrl: !!this.publicUrl,
      compressionEnabled: this.compressionEnabled,
      maxFileSize: Number(this.configService.get('MAX_FILE_SIZE')) || 10485760,
      maxCompressedSize:
        Number(this.configService.get('MAX_COMPRESSED_SIZE')) || 2097152,
      allowedTypes: this.configService
        .get<string>('ALLOWED_FILE_TYPES')
        ?.split(',') || ['image/jpeg', 'image/jpg', 'image/png'],
    };
  }

  /**
   * Verificar conectividad con R2
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    bucket: string;
    timestamp: string;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Intentar listar objetos para verificar conectividad
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          MaxKeys: 1,
        }),
      );

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        bucket: this.bucketName,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(`Health check falló: ${error.message}`);

      return {
        status: 'unhealthy',
        bucket: this.bucketName,
        timestamp: new Date().toISOString(),
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Limpiar archivos antiguos (utility para mantenimiento)
   */
  async cleanupOldFiles(
    olderThanDays: number,
    dryRun: boolean = true,
  ): Promise<{
    found: number;
    deleted: number;
    errors: number;
    totalSizeFreed: number;
    files: string[];
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = await this.listFiles();
      const oldFiles = files.filter((file) => file.lastModified < cutoffDate);

      if (dryRun) {
        this.logger.log(
          `Dry run: Se encontraron ${oldFiles.length} archivos más antiguos que ${olderThanDays} días`,
        );

        return {
          found: oldFiles.length,
          deleted: 0,
          errors: 0,
          totalSizeFreed: oldFiles.reduce((sum, file) => sum + file.size, 0),
          files: oldFiles.map((file) => file.key),
        };
      }

      // Eliminar archivos realmente
      const deleteResults = await this.deleteMultipleFiles(
        oldFiles.map((file) => file.key),
      );
      const totalSizeFreed = oldFiles
        .filter((file) => deleteResults.deleted.includes(file.key))
        .reduce((sum, file) => sum + file.size, 0);

      this.logger.log(
        `🧹 Limpieza completada: ${deleteResults.deleted.length} eliminados, ` +
          `${deleteResults.failed.length} errores, ${(totalSizeFreed / 1024 / 1024).toFixed(2)}MB liberados`,
      );

      return {
        found: oldFiles.length,
        deleted: deleteResults.deleted.length,
        errors: deleteResults.failed.length,
        totalSizeFreed,
        files: deleteResults.deleted,
      };
    } catch (error) {
      this.logger.error(`Error en limpieza: ${error.message}`);
      throw error;
    }
  }
}
