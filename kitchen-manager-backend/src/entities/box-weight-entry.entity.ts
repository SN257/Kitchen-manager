import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class BoxWeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  priceRange: string;

  @Column()
  totalBoxes: string;

  @Column()
  boxType: string; // New column for box type
}