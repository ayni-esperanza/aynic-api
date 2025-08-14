import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordMovementHistory } from './entities/record-movement-history.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { User } from '../users/entities/user.entity';
import { RecordMovementHistoryService } from './record-movement-history.service';
import { MovementTrackingService } from './movement-tracking.service';
import { RecordMovementHistoryController } from './record-movement-history.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordMovementHistory, RecordEntity, User]),
  ],
  controllers: [RecordMovementHistoryController],
  providers: [RecordMovementHistoryService, MovementTrackingService],
  exports: [RecordMovementHistoryService, MovementTrackingService],
})
export class RecordMovementHistoryModule {}
