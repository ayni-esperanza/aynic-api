import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { Record } from '../records/entities/record.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { PurchaseOrderMigrationService } from '../shared/purchase-order-migration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, User, Record]),
    AuthModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchaseOrderMigrationService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
