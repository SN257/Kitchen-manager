import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Recipe } from './recipes.entity'; // Adjust the path as necessary

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  role: string;

  @Column()
  center: string;

  @OneToMany(() => Recipe, (recipe) => recipe.user)
  recipes: Recipe[];
}