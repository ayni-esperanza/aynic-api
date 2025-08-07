import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Record } from './entities/record.entity';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { ScheduleModule } from '../schedules/schedules.module';
import { RecordImagesModule } from '../record-images/record-images.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Record]),
    ScheduleModule, // Importar el módulo de scheduling
    forwardRef(() => RecordImagesModule),
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
