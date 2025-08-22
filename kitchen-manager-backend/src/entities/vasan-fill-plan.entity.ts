import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vasan } from './vasan.entity';
import { Event } from './event.entity';

@Entity()
export class VasanFillPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vasanId: number;

  @ManyToOne(() => Vasan, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vasanId' })
  vasan: Vasan;

  @Column({ nullable: true })
  eventId: number;

  @ManyToOne(() => Event, { eager: true, nullable: true })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ type: 'varchar', length: 200 })
  foodName: string; // selected food to fill

  @Column('float')
  fillWeightKg: number; // planned fill weight in Kg

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
