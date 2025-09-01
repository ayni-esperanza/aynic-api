import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PurchaseOrderStatus {
  PENDING = 'pendiente',
  APPROVED = 'aprobada',
  REJECTED = 'rechazada',
  COMPLETED = 'completada',
  CANCELLED = 'cancelada'
}

export enum PurchaseOrderType {
  LINEA_VIDA = 'linea_vida',
  EQUIPOS = 'equipos',
  ACCESORIOS = 'accesorios',
  SERVICIOS = 'servicios'
}

@Entity('ordenes_compra')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: PurchaseOrderType, default: PurchaseOrderType.LINEA_VIDA })
  tipo: PurchaseOrderType;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.PENDING })
  estado: PurchaseOrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto_total: number;

  @Column({ type: 'text', nullable: true })
  proveedor: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'date', nullable: true })
  fecha_requerida: Date;

  @Column({ type: 'date', nullable: true })
  fecha_aprobacion: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'solicitante_id' })
  solicitante: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'aprobador_id' })
  aprobador: User;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
