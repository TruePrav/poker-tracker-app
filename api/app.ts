import express from 'express';
import cors from 'cors';
import { playerRoutes } from './routes/players';
import { tournamentRoutes } from './routes/tournaments';
import { tableRoutes } from './routes/tables';
import { blindRoutes } from './routes/blinds';
import { transactionRoutes } from './routes/transactions';
import { statsRoutes } from './routes/stats';
import { announcementRoutes } from './routes/announcements';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * The client and this API are served from the same deployment, so a request
 * from the app itself is same-origin and must never be blocked. Vercel preview
 * deployments get a different hostname each time, which would otherwise fail
 * the allowlist and break every POST while GETs still appeared to work.
 */
function isAllowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true; // non-browser or same-origin request
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // Same deployment serving both the page and the API.
  if (host && originHost === host) return true;

  // Any preview/production deployment of this app on Vercel.
  if (/(^|\.)vercel\.app$/i.test(originHost)) return true;

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      // `this` is not available here, so the host is checked per-request below.
      callback(null, true);
      void origin;
    },
    credentials: true,
  })
);

// Enforce the origin rules with access to the request, so same-origin and
// Vercel preview deployments are allowed while unknown sites are not.
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (!isAllowedOrigin(origin, req.headers.host as string | undefined)) {
    return res.status(403).json({ error: 'CORS origin not allowed', origin });
  }
  next();
});
app.use(express.json());

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const { query } = await import('./db');
    await query('SELECT 1');
    res.json({ status: 'ok', name: 'Mahtani Poker Room API', db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message, stack: err.stack?.split('\n').slice(0,3) });
  }
});

// Routes
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/tournaments', tableRoutes);
app.use('/api/blind-structures', blindRoutes);
app.use('/api/tournaments', transactionRoutes);
app.use('/api/tournaments', announcementRoutes);
app.use('/api/stats', statsRoutes);

// Error handling
app.use(errorHandler);

export default app;
