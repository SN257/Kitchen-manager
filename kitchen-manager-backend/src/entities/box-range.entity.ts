import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BoxRange {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    priceRange: string;

    @Column('jsonb')
    boxType: { type: string; quantity: number }[];
        
    @Column({ type: 'integer', nullable: true }) // Changed to integer
    gramPerBox: number;
}