import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordRelationship } from './entities/record-relationship.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { RecordRelationshipService } from './record-relationship.service';
import { RecordRelationshipController } from './record-relationship.controller';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordRelationship, RecordEntity]),
    RecordMovementHistoryModule, // Para tracking de cambios
    AuthModule,
  ],
  controllers: [RecordRelationshipController],
  providers: [RecordRelationshipService],
  exports: [RecordRelationshipService],
})
export class RecordRelationshipModule {}
