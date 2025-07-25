import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  usuario: string;

  @Column({ nullable: true })
  apellidos: string;

  @Column({ nullable: true })
  cargo: string;

  @Column({ nullable: true })
  celular: string;

  @Column()
  contrasenia: string;

  @Column()
  email: string;

  @Column()
  empresa: string;

  @Column()
  nombre: string;

  @Column()
  rol: string;
}
