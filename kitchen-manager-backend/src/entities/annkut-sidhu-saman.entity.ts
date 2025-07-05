import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class AnnkutSidhuSaman {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mithai_id: number;

  @Column()
  mithai_name: string;

  @Column()
  total_nang: number;

  @Column('float')
  total_flour: number;
}
