import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './users.entity';

@Entity()
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vangiName: string;

  @Column({ type: 'jsonb' })
  ingredients: { ingredientName: string; kg: number }[];

  @Column({ type: 'numeric', precision: 10, scale: 3 }) 
    items_per_kg: number;

  @ManyToOne(() => User, user => user.recipes, { eager: true })
  user: User;

  @Column({ nullable: true })
  center: string;
}