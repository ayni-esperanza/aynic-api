import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SeedService } from './users/seed.service';

function parseEnvOrigins(envValue?: string): (string | RegExp)[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCorsOrigin() {
  const allowCredentials = process.env.CORS_CREDENTIALS === 'true';
  const rawEnv = process.env.CORS_ORIGIN?.trim();

  // Caso 1: CORS_ORIGIN="*"  ➜  si credentials=true, usamos origin:true (refleja el origin real)
  if (rawEnv === '*') {
    return allowCredentials ? true : '*';
  }

  // Caso 2: Lista desde ENV o defaults
  const fromEnv = parseEnvOrigins(process.env.CORS_ORIGIN);
  const defaults: (string | RegExp)[] = [
    'http://localhost',
    'http://localhost:3001',
    'https://linea.aynisac.com',
    /\.vercel\.app$/,
    /\.trycloudflare\.com$/,
  ];
  const allowed = fromEnv.length ? fromEnv : defaults;

  // Función que valida origen vs lista/regex
  return (
    origin: string | undefined,
    cb: (err: Error | null, ok?: boolean) => void,
  ) => {
    // Permitir requests sin Origin (curl, Postman, health checks)
    if (!origin) return cb(null, true);

    const ok = allowed.some((rule) => {
      if (rule instanceof RegExp) return rule.test(origin);
      return rule === origin;
    });

    cb(null, ok);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');

  // LOGS TEMPORALES para debug
  console.log('🔍 === MAIN.TS VARIABLES ===');
  console.log(' NODE_ENV:', process.env.NODE_ENV);
  console.log(' PORT:', process.env.PORT);
  console.log(' DB_HOST:', process.env.DB_HOST);
  console.log(' DB_DATABASE:', process.env.DB_DATABASE);
  console.log(' JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
  console.log(' R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID);
  console.log('🚀 === FIN MAIN.TS ===');

  const corsOrigin = buildCorsOrigin();
  const allowCredentials = process.env.CORS_CREDENTIALS === 'true';

  app.enableCors({
    origin: corsOrigin as any,
    credentials: allowCredentials,
    methods:
      process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Has-Next-Page',
      'X-Has-Previous-Page',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Ayni API')
    .setDescription(
      'API para gestión de líneas de vida y usuarios en el sistema Ayni.',
    )
    .setVersion('1.0')
    .addServer('https://linea.aynisac.com/v1', 'Servidor de Producción')
    .addServer('http://localhost:3000/v1', 'Servidor Local')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios')
    .addTag('records', 'Gestión de registros de líneas de vida')
    .addTag('record-status-history', 'Historial de estados de registros')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const seedService = app.get(SeedService);
  await seedService.createDefaultUsers();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(`API: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
  console.log('CORS credentials:', allowCredentials);
  console.log(
    'CORS origin mode:',
    typeof corsOrigin === 'function'
      ? 'custom-check (ENV list + defaults)'
      : corsOrigin,
  );
}

bootstrap();
