import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sectionName' })
  sectionName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'eventId' })
  eventId: number;

  @Column({ name: 'userId' })
  userId: number;

  @Column({ name: 'rows' })
  rows: number;

  @Column({ name: 'columns' })
  columns: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;
}
