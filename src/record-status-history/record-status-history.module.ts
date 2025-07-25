import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordStatusHistory } from './entities/record-status-history.entity';
import { RecordStatusHistoryService } from './record-status-history.service';
import { RecordStatusHistoryController } from './record-status-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RecordStatusHistory])],
  controllers: [RecordStatusHistoryController],
  providers: [RecordStatusHistoryService],
  exports: [RecordStatusHistoryService],
})
export class RecordStatusHistoryModule {}
