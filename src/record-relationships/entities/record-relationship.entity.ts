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

export enum RelationshipType {
  REPLACEMENT = 'REPLACEMENT', // Reemplazo 1:1
  DIVISION = 'DIVISION', // División 1:N
  UPGRADE = 'UPGRADE', // Actualización
}

@Entity('record_relationships')
@Index(['parent_record_id'])
@Index(['child_record_id'])
export class RecordRelationship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parent_record_id: number; // Línea original

  @Column()
  child_record_id: number; // Línea nueva

  @Column({
    type: 'enum',
    enum: RelationshipType,
  })
  relationship_type: RelationshipType;

  @Column({ type: 'text', nullable: true })
  notes?: string; // Notas sobre la relación

  @CreateDateColumn()
  created_at: Date;

  @Column()
  created_by: number;

  // Relaciones
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_record_id' })
  parent_record: RecordEntity;

  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_record_id' })
  child_record: RecordEntity;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;
}
