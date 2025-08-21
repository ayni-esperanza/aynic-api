import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accident } from './entities/accident.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { AccidentsService } from './accidents.service';
import { AccidentsController } from './accidents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Accident, RecordEntity])],
  controllers: [AccidentsController],
  providers: [AccidentsService],
  exports: [AccidentsService],
})
export class AccidentsModule {}
