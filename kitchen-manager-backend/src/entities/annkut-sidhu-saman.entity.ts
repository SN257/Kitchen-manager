import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class AnnkutSidhuSaman {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mithai_id: number;

  @Column()
  mithai_name: string;

  @Column('float')
  total_nang: number;

  @Column('float')
  total_flour: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;
}
