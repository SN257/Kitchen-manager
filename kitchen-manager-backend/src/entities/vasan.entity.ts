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
export class Vasan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vasanName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: number;
}
