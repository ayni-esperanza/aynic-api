import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SeedService } from './users/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods:
      process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: process.env.CORS_CREDENTIALS === 'true',
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

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Aynic API')
    .setDescription(
      'API para gestión de líneas de vida y usuarios en el sistema Ayni.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios')
    .addTag('records', 'Gestión de registros de líneas de vida')
    .addTag('record-status-history', 'Historial de estados de registros')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Inicializar usuarios predefinidos
  const seedService = app.get(SeedService);
  await seedService.createDefaultUsers();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Aplicación ejecutándose en: http://localhost:${port}`);
  console.log(`Documentación Swagger: http://localhost:${port}/api`);
  console.log(`CORS habilitado para: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`Rate Limiting habilitado`);
}

bootstrap();
