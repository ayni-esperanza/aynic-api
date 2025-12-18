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

export enum AlertType {
  POR_VENCER = 'POR_VENCER',
  VENCIDO = 'VENCIDO',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('alertas')
@Index(['tipo', 'registro_id']) // Índice para consultas rápidas
@Index(['leida', 'fecha_creada']) // Índice para alertas no leídas
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  tipo: AlertType;

  @Column()
  registro_id: number;

  @Column()
  mensaje: string;

  @Column({
    type: 'enum',
    enum: AlertPriority,
    default: AlertPriority.MEDIUM,
  })
  prioridad: AlertPriority;

  @CreateDateColumn()
  fecha_creada: Date;

  @Column({ default: false })
  leida: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fecha_leida: Date | null;

  @Column({ nullable: true, type: 'int' })
  usuario_id: number | null; // Para futuras mejoras por usuario

  @Column({ type: 'text', nullable: true })
  metadata: string | null; // JSON como string

  @Column({ default: 1 })
  frecuencia_mostrada: number; // Cuántas veces se ha mostrado

  @Column({ type: 'timestamp', nullable: true })
  ultima_vez_mostrada: Date | null;

  // Relación con Record
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registro_id' })
  record: RecordEntity;
}
