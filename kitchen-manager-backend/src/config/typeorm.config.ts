import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const isTs = process.env.TS_NODE === 'true';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [isTs ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [isTs ? 'src/database/migrations/*-migration.ts' : 'dist/database/migrations/*-migration.js'],
  migrationsRun: true,
  logging: false,
});