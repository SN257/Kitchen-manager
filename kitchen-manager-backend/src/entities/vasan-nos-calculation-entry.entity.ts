import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity('vasan_nos_calculation_entry')
export class VasanNosCalculationEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventId: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  userId: number;

  @Column('json')
  entries: any[]; // [{ vasanId, vasanName, foodName, totalVasan, sectionEntries: [{ sectionId, sectionName, count }] }]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
