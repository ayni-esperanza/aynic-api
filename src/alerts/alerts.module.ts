import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertGeneratorService } from './services/alert-generator.service';
import { StatusCalculatorService } from '../records/services/status-calculator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, RecordEntity])],
  controllers: [AlertsController],
  providers: [AlertsService, AlertGeneratorService, StatusCalculatorService],
  exports: [AlertsService, AlertGeneratorService],
})
export class AlertsModule {}
