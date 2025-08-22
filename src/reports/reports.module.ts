import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity])],
  controllers: [ReportsController],
  providers: [ReportsService, PdfGeneratorService],
  exports: [ReportsService, PdfGeneratorService],
})
export class ReportsModule {}
