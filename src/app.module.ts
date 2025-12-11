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

import { AccidentsModule } from './accidents/accidents.module';
import { AuthorizationCodeModule } from './authorization-codes/authorization-code.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { RecordRelationshipModule } from './record-relationships/record-relationship.module';
import { ReportsModule } from './reports/reports.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { HealthModule } from './health/health.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

import { getDatabaseConfig } from './config/database.config';

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
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
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
    ReportsModule,
    PurchaseOrdersModule,
    HealthModule,
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
