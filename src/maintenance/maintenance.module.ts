import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maintenance } from './entities/maintenance.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { RecordImagesModule } from '../record-images/record-images.module';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, RecordEntity]),
    RecordImagesModule, // Para usar R2Service
    RecordMovementHistoryModule, // Para tracking de cambios
    AuthModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
