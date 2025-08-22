import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Record as RecordEntity } from '../../records/entities/record.entity';

export enum AuthorizationAction {
  DELETE_RECORD = 'DELETE_RECORD',
}

export enum AuthorizationStatus {
  PENDING = 'PENDING',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

@Entity('authorization_codes')
@Index(['code']) // Índice para búsqueda rápida por código
@Index(['expires_at']) // Índice para limpieza de códigos expirados
export class AuthorizationCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 8, unique: true })
  code: string; // Código de 8 caracteres alfanuméricos

  @Column({
    type: 'enum',
    enum: AuthorizationAction,
  })
  action: AuthorizationAction;

  @Column()
  resource_id: number; // ID del registro a eliminar

  @Column()
  resource_code: string; // Código del registro

  @Column()
  requested_by_user_id: number; // Usuario que solicita

  @Column({ nullable: true })
  authorized_by_user_id: number | null; // Administrador que genera el código

  @Column({
    type: 'enum',
    enum: AuthorizationStatus,
    default: AuthorizationStatus.PENDING,
  })
  status: AuthorizationStatus;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  request_ip: string | null;

  @Column({ type: 'text', nullable: true })
  justification: string | null; // Justificación de la solicitud

  // Relaciones
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requested_by: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorized_by_user_id' })
  authorized_by: User | null;

  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  record: RecordEntity;
}
