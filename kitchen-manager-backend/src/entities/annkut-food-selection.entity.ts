import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { FoodItem } from './food-item.entity';

@Entity()
export class AnnkutFoodSelection {
  @PrimaryGeneratedColumn()
  id: number;

  // Optional relation to FoodItem for traceability
  @Column({ nullable: true })
  foodItemId?: number;

  @ManyToOne(() => FoodItem, { eager: true, nullable: true })
  @JoinColumn({ name: 'foodItemId' })
  foodItem?: FoodItem | null;

  // Store the chosen name as snapshot to avoid issues if master changes
  @Column()
  vangiName: string;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: number;
}
