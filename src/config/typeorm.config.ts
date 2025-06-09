import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: ['src/**/*.entity.{js,ts}'],
  migrations: ['src/database/migrations/*-migration.{js,ts}'],
  migrationsRun: true,
  logging: false,
});