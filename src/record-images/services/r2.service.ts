import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  key: string;
  filename: string;
  publicUrl: string;
  size: number;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

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

    this.logger.log(`R2 Service inicializado - Bucket: ${this.bucketName}`);
  }

  /**
   * Subir archivo a R2
   */
  async uploadFile(
    file: Express.Multer.File,
    recordId: number,
    userId?: number,
  ): Promise<UploadResult> {
    try {
      // Generar nombre único para el archivo
      const fileExtension = this.getFileExtension(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const key = `records/${recordId}/${filename}`;

      // Validar archivo
      this.validateFile(file);

      // Comando para subir archivo
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          recordId: recordId.toString(),
          uploadedBy: userId?.toString() || 'unknown',
          uploadDate: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      const publicUrl = this.publicUrl
        ? `${this.publicUrl}/${key}`
        : await this.getSignedDownloadUrl(key);

      this.logger.log(`Archivo subido exitosamente: ${key}`);

      return {
        key,
        filename,
        publicUrl,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error}`);
      throw error;
    }
  }

  /**
   * Obtener URL firmada para descarga (válida por 1 hora)
   */
  async getSignedDownloadUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hora
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`Error al generar URL firmada: ${error}`);
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
      this.logger.error(`Error al eliminar archivo: ${error}`);
      throw error;
    }
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
   * Obtener metadatos de un archivo
   */
  async getFileMetadata(key: string) {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(headCommand);
      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Error al obtener metadatos: ${error}`);
      throw error;
    }
  }

  /**
   * Validar archivo antes de subir
   */
  private validateFile(file: Express.Multer.File): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 5242880; // 5MB default
    const allowedTypes = this.configService
      .get<string>('ALLOWED_FILE_TYPES')
      ?.split(',') || ['image/jpeg', 'image/jpg', 'image/png'];

    // Validar tamaño
    if (file.size > maxSize) {
      throw new Error(
        `Archivo muy grande. Máximo permitido: ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Validar tipo de archivo
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`,
      );
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
   * Generar URL pública (si está configurada)
   */
  getPublicUrl(key: string): string | null {
    return this.publicUrl ? `${this.publicUrl}/${key}` : null;
  }
}
