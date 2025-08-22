import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class WeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vangiName: string;

  @Column('float')
  gram: number;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: number;
}
