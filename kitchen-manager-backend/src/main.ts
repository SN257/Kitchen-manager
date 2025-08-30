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
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'your-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    }),
  );

  // CORS setup
  let allowedOrigins: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    allowedOrigins = ['https://kitchen-manager-kohl.vercel.app'];
  } else {
    allowedOrigins = ['http://localhost:5173'];
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Use Render's port or fallback to 3000
  await app.listen(process.env.PORT || 3000);
}
bootstrap();