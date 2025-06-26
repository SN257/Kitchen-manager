import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class WeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vangiName: string;

  @Column('float')
  gram: number;
  
  @CreateDateColumn()
  createdAt: Date;
}