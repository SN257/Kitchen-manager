import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class BoxWeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  priceRange: string;

  @Column()
  gram: string;

  @Column()
  totalBoxes: string;
}