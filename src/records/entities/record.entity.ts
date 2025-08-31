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

  @Column({ type: 'varchar', length: 100, nullable: true })
  anclaje_equipos?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    unique: true,
    comment: 'Código de identificación físico de la placa',
  })
  codigo_placa?: string | null;

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
  seccion: string;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  planta: string;

  @Column({ nullable: true })
  tipo_linea: string;

  @Column({ nullable: true })
  ubicacion: string;

  @Column({ type: 'date', nullable: true })
  fecha_caducidad: Date;

  @Column({ nullable: true })
  estado_actual: string;
}
