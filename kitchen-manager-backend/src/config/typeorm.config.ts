import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/users.entity';
import { Recipe } from '../entities/recipes.entity';
import { Ingredient } from '../entities/ingredient.entity';
import { FoodItem } from '../entities/food-item.entity';
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [User, Recipe, Ingredient, FoodItem],
  migrations: [
    process.env.TS_NODE === 'true'
      ? 'src/database/migrations/*-migration.ts'
      : 'dist/database/migrations/*-migration.js',
  ],
  migrationsRun: true,
  logging: false,
});