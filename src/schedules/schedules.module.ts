import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Record } from '../records/entities/record.entity';
import { StatusUpdateService } from './status-update.service';
import { StatusCalculatorService } from '../records/services/status-calculator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Record])],
  providers: [StatusUpdateService, StatusCalculatorService],
  exports: [StatusUpdateService, StatusCalculatorService],
})
export class ScheduleModule {}
