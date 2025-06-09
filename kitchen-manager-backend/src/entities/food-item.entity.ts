import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FoodItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vangiName: string;

  @Column()
  category: string;
}