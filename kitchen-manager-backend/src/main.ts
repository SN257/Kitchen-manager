import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as pgSession from 'connect-pg-simple';
import { config } from 'dotenv';
import { Pool } from 'pg';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // PostgreSQL pool
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Session middleware
  app.use(
    session({
      store: new (pgSession(session))({
        pool: pgPool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'your-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    }),
  );

  // CORS setup
  const allowedOrigins = ['http://localhost:5173'];
  if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Dynamic port for Render
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();