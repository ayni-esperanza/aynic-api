import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { User } from '../users/entities/user.entity';
import { Record } from '../records/entities/record.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const purchaseOrder = this.purchaseOrderRepository.create({
      ...createPurchaseOrderDto,
    });
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({ where: { id } });

    if (!purchaseOrder) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return purchaseOrder;
  }

  async update(id: number, updatePurchaseOrderDto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id);
    Object.assign(purchaseOrder, updatePurchaseOrderDto);
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async remove(id: number): Promise<void> {
    const purchaseOrder = await this.findOne(id);
    await this.purchaseOrderRepository.remove(purchaseOrder);
  }

  async linkToRecord(recordId: number, numero: string, termino_referencias?: string): Promise<Record> {
    let po = await this.purchaseOrderRepository.findOne({ where: { numero } });
    if (!po) {
      po = this.purchaseOrderRepository.create({ numero, termino_referencias });
    } else if (termino_referencias !== undefined) {
      po.termino_referencias = termino_referencias;
    }
    po = await this.purchaseOrderRepository.save(po);

    const record = await this.recordRepository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException('Registro no encontrado');
    }
    (record as any).purchaseOrder = po;
    return await this.recordRepository.save(record);
  }

  async unlinkFromRecord(recordId: number): Promise<Record> {
    const record = await this.recordRepository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException('Registro no encontrado');
    }
    (record as any).purchaseOrder = null;
    return await this.recordRepository.save(record);
  }
}
