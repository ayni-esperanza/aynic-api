import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Record as RecordEntity } from '../../records/entities/record.entity';
import { User } from '../../users/entities/user.entity';

@Entity('maintenances')
@Index(['record_id', 'maintenance_date'])
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  record_id: number;

  @Column({ type: 'date' })
  maintenance_date: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'double precision', nullable: true })
  previous_length_meters?: number;

  @Column({ type: 'double precision', nullable: true })
  new_length_meters?: number;

  @Column({ nullable: true })
  image_filename?: string;

  @Column({ nullable: true })
  image_r2_key?: string;

  @Column({ type: 'int', nullable: true })
  image_size?: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'int', nullable: true })
  created_by?: number;

  // Relaciones
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  record: RecordEntity;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  user: User | null;
}
