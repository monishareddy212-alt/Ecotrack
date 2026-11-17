import 'dotenv/config';
import expressMySQLSession from 'express-mysql-session';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadServerConfig } from './server/config/env';
import {
  closeDatabasePool,
  getPool,
  isDatabaseConfigured,
  testDatabaseConnection,
} from './server/db/connection';
import { runMigrations } from './server/db/migrate';
import { runAllSeeds } from './server/db/seeds/seedAll';
import authRoutes from './server/routes/authRoutes';
import activityRoutes from './server/routes/activityRoutes';
import analyticsRoutes from './server/routes/analyticsRoutes';
import goalRoutes from './server/routes/goalRoutes';
import recommendationRoutes from './server/routes/recommendationRoutes';
import reportRoutes from './server/routes/reportRoutes';
import profileRoutes from './server/routes/profileRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running the bundled server artifact (e.g. node server.js), default NODE_ENV to production if unset
if (
  !process.env.NODE_ENV &&
  process.argv[1] &&
  (path.resolve(process.argv[1]).endsWith('server.js') || path.resolve(process.argv[1]).endsWith('server.mjs'))
) {
  process.env.NODE_ENV = 'production';
}

export function createApp() {
  const config = loadServerConfig();
  const app = express();

  // Required behind Render / cloud reverse proxies for secure cookies and rate limiting
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  const MySQLStore = expressMySQLSession(session as any);
  const store = isDatabaseConfigured()
    ? new MySQLStore(
        {
          clearExpired: true,
          checkExpirationInterval: 900_000,
          expiration: 7 * 24 * 60 * 60 * 1000,
          createDatabaseTable: true,
          schema: {
            tableName: 'sessions',
            columnNames: {
              session_id: 'session_id',
              expires: 'expires',
              data: 'data',
            },
          },
        },
        getPool() as any
      )
    : undefined;

  if (!isDatabaseConfigured() && !config.isProduction) {
    console.warn(
      'EcoTrack: DATABASE_URL is not configured. MySQL auth and session persistence are disabled until DATABASE_URL is set.'
    );
  } else if (!isDatabaseConfigured() && config.isProduction) {
    console.error(
      'EcoTrack: DATABASE_URL is not configured in production. Database-backed routes will return HTTP 503 until DATABASE_URL is set.'
    );
  }

  if (!config.hasExplicitSessionSecret && !config.isProduction) {
    console.warn(
      'EcoTrack: SESSION_SECRET is not set. Using an ephemeral development secret for this process.'
    );
  }

  app.use(
    session({
      name: 'ecotrack.sid',
      store,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      proxy: config.isProduction,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      },
    })
  );

  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbStatus = await testDatabaseConnection();
    res.status(200).json({
      status: dbStatus.status === 'error' ? 'degraded' : 'ok',
      service: 'ecotrack-api',
      phase: 6,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', activityRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', goalRoutes);
  app.use('/api', recommendationRoutes);
  app.use('/api', reportRoutes);
  app.use('/api', profileRoutes);

  app.all(['/api', '/api/*'], (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'API endpoint not found.',
      message: 'The requested EcoTrack API route does not exist.',
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('Unhandled API error:', message);
    if (res.headersSent) return;
    res.status(500).json({
      error: 'An internal server error occurred. Please try again.',
    });
  });

  return app;
}

async function startServer() {
  const config = loadServerConfig();
  const app = createApp();

  if (isDatabaseConfigured()) {
    try {
      console.log('EcoTrack: Checking database schema and executing pending migrations...');
      const applied = await runMigrations();
      if (applied.length > 0) {
        console.log(`EcoTrack: Successfully applied ${applied.length} migration(s): ${applied.join(', ')}`);
      } else {
        console.log('EcoTrack: Database schema is up to date.');
      }
      const seedSummary = await runAllSeeds();
      if (seedSummary.activityTypesInserted > 0 || seedSummary.emissionFactorsUpserted > 0) {
        console.log(
          `EcoTrack: Database verified with seed data (${seedSummary.activityTypesInserted} new activity types, ${seedSummary.emissionFactorsUpserted} emission factors).`
        );
      }
    } catch (dbInitErr) {
      console.error(
        'EcoTrack: Notice - database auto-migration / seed initialization error during startup:',
        dbInitErr instanceof Error ? dbInitErr.message : dbInitErr
      );
    }
  }

  if (config.isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.join(distDir, 'index.html');

    if (fs.existsSync(distDir)) {
      app.use(
        express.static(distDir, {
          maxAge: '1d',
          index: false,
        })
      );
    }

    // SPA fallback: send index.html for client-side navigation
    app.get('*', (req: Request, res: Response) => {
      // Return 404 for missing static assets with extensions (e.g. .js, .css, .ico)
      if (path.extname(req.path)) {
        res.status(404).send('Asset not found');
        return;
      }

      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(
      `EcoTrack server listening on http://0.0.0.0:${config.port} (${config.isProduction ? 'production' : 'development'})`
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing HTTP server and database pool...`);
    server.close(async () => {
      await closeDatabasePool().catch(() => undefined);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

const isMainModule =
  process.argv[1] !== undefined && /server\.(ts|js|mjs)$/.test(process.argv[1]);

if (isMainModule) {
  startServer().catch(async (err) => {
    console.error('Failed to start EcoTrack server:', err instanceof Error ? err.message : err);
    await closeDatabasePool().catch(() => undefined);
    process.exit(1);
  });
}
