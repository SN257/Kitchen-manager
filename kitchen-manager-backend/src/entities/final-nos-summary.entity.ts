import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Index } from 'typeorm';
import { Event } from './event.entity';

@Entity('final_nos_summary')
@Index('UQ_final_nos_summary_event_user', ['eventId', 'userId'], {
  unique: true,
})
export class FinalNosSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;

  @Column('jsonb')
  rows: any[]; // [{ foodName, totalWeightKg, totalNang, finalFlour }]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
