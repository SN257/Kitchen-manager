import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as pgSession from 'connect-pg-simple';
import { config } from 'dotenv';
import { Pool } from 'pg';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup PostgreSQL pool
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Setup session middleware
  app.use(
    session({
      store: new (pgSession(session))({
        pool: pgPool,
        createTableIfMissing: true, // <-- This will auto-create the session table if missing
      }),
      secret: process.env.SESSION_SECRET || 'your-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    }),
  );

  // Enable CORS if needed
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();