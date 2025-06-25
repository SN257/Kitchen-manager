import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BoxRange {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    priceRange: string;

    @Column({ type: 'varchar', length: 255 })
    boxType: string;

    @Column({ type: 'integer', nullable: true }) // Changed to integer
    gramPerBox: number;
}