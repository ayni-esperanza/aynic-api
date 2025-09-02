import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig = (): CorsOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    origin: isDevelopment
      ? '*' // En desarrollo, permitir cualquier origen
      : process.env.CORS_ORIGIN?.split(',') || ['http://localhost', 'http://localhost:3001'], // En producción, dominios específicos

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    credentials: true,

    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'Cache-Control',
    ],

    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Has-Next-Page',
      'X-Has-Previous-Page',
    ],

    // Tiempo en segundos que el navegador puede cachear las respuestas preflight
    maxAge: 86400, // 24 horas
  };
};
