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
export class BoxRange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  priceRange: string;

  @Column('simple-array')
  boxType: string[];

  @Column('float')
  gramPerBox: number;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;
}
