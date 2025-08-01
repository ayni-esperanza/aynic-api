import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('registro')
export class Record {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column({ nullable: true })
  cliente: string;

  @Column({ nullable: true })
  equipo: string;

  @Column({ nullable: true })
  fv_anios: number;

  @Column({ nullable: true })
  fv_meses: number;

  @Column({ type: 'date', nullable: true })
  fecha_instalacion: Date;

  @Column({ type: 'double precision', nullable: true })
  longitud: number;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  seec: string;

  @Column({ nullable: true })
  tipo_linea: string;

  @Column({ nullable: true })
  ubicacion: string;

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento: Date;

  @Column({ nullable: true })
  estado_actual: string;
}
