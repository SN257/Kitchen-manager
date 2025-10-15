import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class BoxWeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  priceRange: string;

  @Column()
  boxType: string;

  @Column()
  totalBoxes: number;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;
}
