import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';

export const multerConfig: MulterOptions = {
  // Usar memoria en lugar de disco
  storage: undefined, // Usa memory storage por defecto

  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_MB || 6) * 1024 * 1024, // 6MB default
    files: 1, // Solo un archivo por request
  },

  fileFilter: (req, file, callback) => {
    // Tipos de archivo permitidos
    const allowedMimeTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    // Validar tipo MIME
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Tipo de archivo no válido. Tipos permitidos: ${allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    }

    // Validar extensión de archivo
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return callback(
        new BadRequestException(
          `Extensión de archivo no válida. Extensiones permitidas: ${allowedExtensions.join(', ')}`,
        ),
        false,
      );
    }

    // Validar nombre de archivo
    if (!file.originalname || file.originalname.length > 255) {
      return callback(
        new BadRequestException('Nombre de archivo inválido o muy largo'),
        false,
      );
    }

    callback(null, true);
  },
};
