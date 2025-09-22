import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Record } from '../../records/entities/record.entity';

@Entity('ordenes_compra')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  // Número de orden de compra (único)
  @Column({ type: 'varchar', length: 50, unique: true })
  numero: string;

  // Término y referencias asociadas a la OC
  @Column({ type: 'varchar', length: 1000, nullable: true })
  termino_referencias?: string | null;

  @OneToMany(() => Record, (record) => record.purchaseOrder)
  records?: Record[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
