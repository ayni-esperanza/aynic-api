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

export enum MovementAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  IMAGE_UPLOAD = 'IMAGE_UPLOAD',
  IMAGE_REPLACE = 'IMAGE_REPLACE',
  IMAGE_DELETE = 'IMAGE_DELETE',
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  COMPANY_CHANGE = 'COMPANY_CHANGE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('record_movement_history')
@Index(['record_id', 'action_date'])
@Index(['action', 'action_date'])
@Index(['user_id', 'action_date'])
export class RecordMovementHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  record_id: number | null;

  @Column({
    type: 'enum',
    enum: MovementAction,
  })
  action: MovementAction;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @CreateDateColumn()
  action_date: Date;

  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'text', nullable: true })
  previous_values: string | null;

  @Column({ type: 'text', nullable: true })
  new_values: string | null;

  @Column({ type: 'text', nullable: true })
  changed_fields: string | null;

  @Column({ type: 'boolean', default: true })
  is_record_active: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  record_code: string | null;

  @Column({ type: 'text', nullable: true })
  additional_metadata: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  // Relaciones
  @ManyToOne(() => RecordEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'record_id' })
  record: RecordEntity | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
