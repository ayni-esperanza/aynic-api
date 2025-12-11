import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';

@Injectable()
export class PurchaseOrderMigrationService implements OnModuleInit {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  async onModuleInit() {
    await this.migratePurchaseOrderNumbers();
  }

  private async migratePurchaseOrderNumbers() {
    try {
      // Buscar órdenes sin número
      const ordersWithoutNumber = await this.purchaseOrderRepository.find({
        where: { numero: null as any },
      });

      if (ordersWithoutNumber.length === 0) {
        console.log('✓ Todas las órdenes de compra ya tienen número asignado');
        return;
      }

      console.log(
        `Actualizando ${ordersWithoutNumber.length} órdenes de compra sin número...`,
      );

      for (const order of ordersWithoutNumber) {
        order.numero = `OC-${String(order.id).padStart(6, '0')}`;
        await this.purchaseOrderRepository.save(order);
      }

      console.log('✓ Órdenes de compra actualizadas correctamente');
    } catch (error) {
      console.error('Error actualizando órdenes de compra:', error.message);
    }
  }
}
