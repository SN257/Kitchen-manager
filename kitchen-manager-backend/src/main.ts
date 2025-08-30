import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as pgSession from 'connect-pg-simple';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { JwtService } from '@nestjs/jwt';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // PostgreSQL pool
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Behind Render/other proxies we must trust the proxy so secure cookies work
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

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
      name: process.env.SESSION_COOKIE_NAME || 'km.sid',
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        // For cross-site cookies between Vercel (frontend) and Render (backend)
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd, // required for SameSite=None
      },
    }),
  );

  // Support Authorization: Bearer <token> by syncing to req.session for this request
  const jwtService = app.get(JwtService);
  expressApp.use(async (req, _res, next) => {
    try {
      const auth = req.headers['authorization'];
      if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const token = auth.slice('Bearer '.length);
        const payload = jwtService.verify(token);
        // Ensure session object exists (created by express-session middleware)
        if ((req as any).session) {
          (req as any).session.userId = payload.sub;
          (req as any).session.username = payload.username;
        }
      }
    } catch {
      // ignore invalid tokens; downstream will treat as unauthenticated
    }
    next();
  });

  // CORS setup
  const allowedOrigins = ['http://localhost:5173'];
  // Comma-separated list of exact origins, e.g. https://your-app.vercel.app,https://preview-your-app.vercel.app
  const corsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
  if (corsOrigins) {
    corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => allowedOrigins.push(o));
  }
  // Optional regex patterns, comma separated. Example: ^https:\/\/.+\.vercel\.app$
  const originPatternEnv = process.env.CORS_ORIGIN_PATTERNS || '';
  const allowedOriginPatterns = originPatternEnv
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null as unknown as RegExp;
      }
    })
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (allowedOriginPatterns.some((re) => re.test(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Dynamic port for Render
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();