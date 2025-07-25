import { Module } from '@nestjs/common';
import { RecordStatusHistoryService } from './record-status-history.service';
import { RecordStatusHistoryController } from './record-status-history.controller';

@Module({
  controllers: [RecordStatusHistoryController],
  providers: [RecordStatusHistoryService],
})
export class RecordStatusHistoryModule {}
