import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class Vasan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vasanName: string;

  @Column()
  foodName: string;

  @Column('float')
  totalWeight: number; // total weight value

  @Column('int')
  totalVasan: number; // count of vasan

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  userId: number;
}
