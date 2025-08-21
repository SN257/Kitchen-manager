import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('section_vasan_summary')
export class SectionVasanSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;

  @Column('jsonb')
  rows: any[]; // [{ vasanId, vasanName, foodName, weightPerVasanKg, totalNos, totalWeightKg, flourRequiredKg }]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
