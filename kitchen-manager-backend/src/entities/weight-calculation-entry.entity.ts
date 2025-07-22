import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('weight_calculation_entries')
export class WeightCalculationEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('jsonb')
  entries: any[];

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;
}
