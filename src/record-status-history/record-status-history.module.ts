import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordStatusHistory } from './entities/record-status-history.entity';
import { RecordStatusHistoryService } from './record-status-history.service';
import { RecordStatusHistoryController } from './record-status-history.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RecordStatusHistory]), AuthModule],
  controllers: [RecordStatusHistoryController],
  providers: [RecordStatusHistoryService],
  exports: [RecordStatusHistoryService],
})
export class RecordStatusHistoryModule {}
