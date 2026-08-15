import express from 'express';
import cors from 'cors';
import { playerRoutes } from './routes/players.js';
import { tournamentRoutes } from './routes/tournaments.js';
import { tableRoutes } from './routes/tables.js';
import { blindRoutes } from './routes/blinds.js';
import { transactionRoutes } from './routes/transactions.js';
import { statsRoutes } from './routes/stats.js';
import { announcementRoutes } from './routes/announcements.js';
import { errorHandler } from './middleware/errorHandler.js';

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
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Mahtani Poker Room API' });
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
