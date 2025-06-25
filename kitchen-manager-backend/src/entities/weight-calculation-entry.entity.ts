import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class WeightCalculationEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('jsonb')
  entries: any; // Array of MithaiEntryDto

  @CreateDateColumn()
  createdAt: Date;
}