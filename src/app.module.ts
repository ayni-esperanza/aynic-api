import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { RecordStatusHistoryModule } from './record-status-history/record-status-history.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';

import { User } from './users/entities/user.entity';
import { Record } from './records/entities/record.entity';
import { RecordStatusHistory } from './record-status-history/entities/record-status-history.entity';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configuración de Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get('NODE_ENV') === 'development';

        if (isDevelopment) {
          // En desarrollo: más permisivo
          return [
            {
              name: 'short',
              ttl: 60000, // 1 minuto
              limit: 100, // 100 requests por minuto
            },
          ];
        }

        // En producción: más restrictivo
        return [
          {
            name: 'short',
            ttl: Number(config.get('THROTTLE_TTL')) || 60000, // 1 minuto
            limit: Number(config.get('THROTTLE_LIMIT')) || 20, // 20 requests por minuto
          },
        ];
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: +(config.get<number>('DB_PORT') ?? 5432),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User, Record, RecordStatusHistory],
        synchronize: true, // solo en desarrollo
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    RecordsModule,
    RecordStatusHistoryModule,
    AuthModule,
    SharedModule,
  ],
  providers: [
    // Rate Limiting Guard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
