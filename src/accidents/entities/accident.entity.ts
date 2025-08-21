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

export enum EstadoAccidente {
  REPORTADO = 'REPORTADO',
  EN_INVESTIGACION = 'EN_INVESTIGACION',
  RESUELTO = 'RESUELTO',
}

export enum SeveridadAccidente {
  LEVE = 'LEVE',
  MODERADO = 'MODERADO',
  GRAVE = 'GRAVE',
  CRITICO = 'CRITICO',
}

@Entity('accidentes')
@Index(['linea_vida_id', 'fecha_accidente'])
@Index(['fecha_accidente'])
export class Accident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  linea_vida_id: number;

  @Column({ type: 'date' })
  fecha_accidente: Date;

  @Column({ type: 'text' })
  descripcion_incidente: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  persona_involucrada: string | null;

  @Column({ type: 'text', nullable: true })
  acciones_correctivas: string | null;

  @Column({ type: 'text', nullable: true })
  evidencias_urls: string | null; // JSON array de URLs de evidencias

  @CreateDateColumn()
  fecha_creacion: Date;

  @Column({ type: 'int', nullable: true })
  reportado_por: number | null;

  @Column({
    type: 'enum',
    enum: EstadoAccidente,
    default: EstadoAccidente.REPORTADO,
  })
  estado: string;

  @Column({
    type: 'enum',
    enum: SeveridadAccidente,
    default: SeveridadAccidente.LEVE,
  })
  severidad: string;

  // Relaciones
  @ManyToOne(() => RecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linea_vida_id' })
  lineaVida: RecordEntity;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reportado_por' })
  usuario: User | null;
}
