import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SeedService } from './users/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Aynic API')
    .setDescription('Documentación de la API de Aynic')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Inicializar usuarios predefinidos
  const seedService = app.get(SeedService);
  await seedService.createDefaultUsers();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
