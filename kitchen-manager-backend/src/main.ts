import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as pgSession from 'connect-pg-simple';
import { config } from 'dotenv';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const PgSession = pgSession(session);

  // Use environment variables for DB connection and CORS
  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
      }),
      secret: process.env.SESSION_SECRET || 'your-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: isProd }, // secure cookies in production
    }),
  );

  app.enableCors({
    origin: isProd ? '/api' : 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();