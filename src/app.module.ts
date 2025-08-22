import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { RecordStatusHistoryModule } from './record-status-history/record-status-history.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { ScheduleModule } from './schedules/schedules.module';
import { AlertsModule } from './alerts/alerts.module';
import { RecordImagesModule } from './record-images/record-images.module';
import { RecordMovementHistoryModule } from './record-movement-history/record-movement-history.module';

import { User } from './users/entities/user.entity';
import { Record } from './records/entities/record.entity';
import { RecordStatusHistory } from './record-status-history/entities/record-status-history.entity';
import { Alert } from './alerts/entities/alert.entity';
import { RecordImage } from './record-images/entities/record-image.entity';
import { RecordMovementHistory } from './record-movement-history/entities/record-movement-history.entity';

import { AccidentsModule } from './accidents/accidents.module';
import { Accident } from './accidents/entities/accident.entity';

import { AuthorizationCodeModule } from './authorization-codes/authorization-code.module';
import { AuthorizationCode } from './authorization-codes/entities/authorization-code.entity';

import { MaintenanceModule } from './maintenance/maintenance.module';
import { Maintenance } from './maintenance/entities/maintenance.entity';

import { RecordRelationshipModule } from './record-relationships/record-relationship.module';
import { RecordRelationship } from './record-relationships/entities/record-relationship.entity';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Habilitar scheduling de tareas
    NestScheduleModule.forRoot(),
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
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST') ?? 'localhost';
        const port = +(config.get<number>('DB_PORT') ?? 5432);

        // 1) Bandera explícita por ENV
        const sslFromEnv = (config.get<string>('DB_SSL') ?? '').toLowerCase();

        // 2) Heurística por host
        const looksManaged = [
          'rds.amazonaws.com',
          'neon.tech',
          'render.com',
          'supabase.co',
          'azure.com',
          'gcp',
        ].some((dom) => host.includes(dom));

        // Resultado final: solo true en managed/prod o si DB_SSL=true
        const enableSSL =
          sslFromEnv === 'true' || (sslFromEnv !== 'false' && looksManaged);

        return {
          type: 'postgres',
          host,
          port,
          username: config.get('DB_USERNAME'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_DATABASE'),
          entities: [
            User,
            Record,
            RecordStatusHistory,
            Alert,
            RecordImage,
            RecordMovementHistory,
            Accident,
            AuthorizationCode,
            Maintenance,
            RecordRelationship,
          ],
          synchronize: true,
          autoLoadEntities: true,
          // En TypeORM/pg, pon booleano false para desactivar SSL
          ssl: enableSSL ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    RecordsModule,
    RecordStatusHistoryModule,
    AuthModule,
    SharedModule,
    ScheduleModule,
    AlertsModule,
    RecordImagesModule,
    RecordMovementHistoryModule,
    AccidentsModule,
    AuthorizationCodeModule,
    MaintenanceModule,
    RecordRelationshipModule,
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
