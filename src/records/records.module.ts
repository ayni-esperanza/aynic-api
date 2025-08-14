import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Record } from './entities/record.entity';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { ScheduleModule } from '../schedules/schedules.module';
import { RecordImagesModule } from '../record-images/record-images.module';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module'; // NUEVO

@Module({
  imports: [
    TypeOrmModule.forFeature([Record]),
    ScheduleModule, // Importar el módulo de scheduling
    forwardRef(() => RecordImagesModule),
    RecordMovementHistoryModule,
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
