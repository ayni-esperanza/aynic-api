import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Record } from '../../records/entities/record.entity';

@Entity('registro_estado_historial')
export class RecordStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  registro_id: number;

  @Column()
  estado: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_cambio: Date;

  @Column({ nullable: true })
  observacion: string;

  @ManyToOne(() => Record, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registro_id' })
  record: Record;
}
