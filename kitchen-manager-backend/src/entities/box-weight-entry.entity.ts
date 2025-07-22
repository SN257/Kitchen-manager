import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class BoxWeightEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  priceRange: string;

  @Column()
  totalBoxes: string;

  @Column()
  boxType: string;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

}
