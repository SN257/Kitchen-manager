import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [join(__dirname, '/../**/*.entity.{js,ts}')],
  migrations: [
    process.env.TS_NODE === 'true'
      ? join(__dirname, '/../database/migrations/*.{ts,js}')
      : join(__dirname, '/../database/migrations/*.{js,ts}'),
  ],
  migrationsRun: false,
  logging: false,
});
