import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderType } from './entities/purchase-order.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto, userId: number): Promise<PurchaseOrder> {
    const solicitante = await this.userRepository.findOne({ where: { id: userId } });
    if (!solicitante) {
      throw new NotFoundException('Usuario solicitante no encontrado');
    }

    const purchaseOrder = this.purchaseOrderRepository.create({
      ...createPurchaseOrderDto,
      solicitante,
      estado: PurchaseOrderStatus.PENDING,
    });

    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      relations: ['solicitante', 'aprobador'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: ['solicitante', 'aprobador'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return purchaseOrder;
  }

  async update(id: number, updatePurchaseOrderDto: UpdatePurchaseOrderDto, userId: number): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id);
    
    // Si se está aprobando, verificar que el usuario sea aprobador
    if (updatePurchaseOrderDto.estado === PurchaseOrderStatus.APPROVED) {
      const aprobador = await this.userRepository.findOne({ where: { id: userId } });
      if (!aprobador) {
        throw new NotFoundException('Usuario aprobador no encontrado');
      }
      
      updatePurchaseOrderDto.aprobador = aprobador;
      updatePurchaseOrderDto.fecha_aprobacion = new Date().toISOString();
    }

    Object.assign(purchaseOrder, updatePurchaseOrderDto);
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async remove(id: number): Promise<void> {
    const purchaseOrder = await this.findOne(id);
    
    if (purchaseOrder.estado !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Solo se pueden eliminar órdenes pendientes');
    }

    await this.purchaseOrderRepository.remove(purchaseOrder);
  }

  async findByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      where: { estado: status },
      relations: ['solicitante', 'aprobador'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findByType(type: PurchaseOrderType): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      where: { tipo: type },
      relations: ['solicitante', 'aprobador'],
      order: { fecha_creacion: 'DESC' },
    });
  }
}
