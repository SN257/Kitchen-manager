import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class WeightCalculationEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('jsonb')
  entries: { boxId: number; mithaiId: number; pieces: number }[]; // Array of MithaiEntryDto

  @CreateDateColumn()
  createdAt: Date;
}