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

@Entity('record_images')
@Index(['record_id']) // Índice para consultas rápidas por record
export class RecordImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  record_id: number;

  @Column()
  filename: string; // Nombre generado para R2

  @Column()
  original_name: string; // Nombre original del archivo

  @Column()
  file_size: number; // Tamaño en bytes

  @Column()
  mime_type: string; // image/jpeg, image/png, etc.

  @Column()
  r2_key: string; // Key completa en R2: records/123/image-uuid.jpg

  @Column({ nullable: true })
  description?: string; // Descripción opcional

  @CreateDateColumn()
  upload_date: Date;

  @Column({ nullable: true })
  uploaded_by: number; // ID del usuario que subió

  @Column({ default: true })
  is_active: boolean; // Para soft delete

  // Relaciones
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  record: RecordEntity;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User;
}