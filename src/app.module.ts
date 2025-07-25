import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { RecordStatusHistoryModule } from './record-status-history/record-status-history.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';

import { User } from './users/entities/user.entity';
import { Record } from './records/entities/record.entity';
import { RecordStatusHistory } from './record-status-history/entities/record-status-history.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Puedes usar variables de entorno en todo el proyecto
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
        autoLoadEntities: true, // si usas TypeORM con módulos
      }),
    }),
    UsersModule,
    RecordsModule,
    RecordStatusHistoryModule,
    AuthModule,
    SharedModule,
  ],
})
export class AppModule {}
