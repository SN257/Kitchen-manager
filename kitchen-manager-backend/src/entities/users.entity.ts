import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Recipe } from './recipes.entity'; // Adjust the path as necessary

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  center: string;

  @Column('simple-array', { nullable: true })
  allocatedCenters: string[];

  @OneToMany(() => Recipe, (recipe) => recipe.user)
  recipes: Recipe[];
}
