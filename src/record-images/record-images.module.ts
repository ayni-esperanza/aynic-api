import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordImage } from './entities/record-image.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { RecordImagesService } from './record-images.service';
import {
  RecordImagesController,
  AdminImagesController,
} from './record-images.controller';
import { R2Service } from './services/r2.service';
import { ImageCompressionService } from './services/image-compression.service';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module'; // NUEVO

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordImage, RecordEntity]),
    RecordMovementHistoryModule,
  ],
  controllers: [RecordImagesController, AdminImagesController],
  providers: [RecordImagesService, R2Service, ImageCompressionService],
  exports: [RecordImagesService, R2Service, ImageCompressionService],
})
export class RecordImagesModule {}
