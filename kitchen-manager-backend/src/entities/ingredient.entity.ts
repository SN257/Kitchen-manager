import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Ingredient {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ingredientName: string;

    @Column()
    category: string;

    @Column()
    pricePerKg: number;
}