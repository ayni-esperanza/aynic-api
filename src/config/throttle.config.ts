import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const getThrottlerConfig = (): ThrottlerModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // En desarrollo: más permisivo
    return [
      {
        name: 'short',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
      {
        name: 'medium',
        ttl: 60000 * 15, // 15 minutos
        limit: 500, // 500 requests por 15 minutos
      },
    ];
  }

  // En producción: más restrictivo
  return [
    {
      name: 'short',
      ttl: 60000, // 1 minuto
      limit: Number(process.env.THROTTLE_LIMIT) || 20, // 20 requests por minuto
    },
    {
      name: 'medium',
      ttl: 60000 * 15, // 15 minutos
      limit: 200, // 200 requests por 15 minutos
    },
    {
      name: 'long',
      ttl: 60000 * 60, // 1 hora
      limit: 1000, // 1000 requests por hora
    },
  ];
};
