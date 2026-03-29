import express from 'express';
import cors from 'cors';
import { playerRoutes } from './routes/players.js';
import { tournamentRoutes } from './routes/tournaments.js';
import { tableRoutes } from './routes/tables.js';
import { blindRoutes } from './routes/blinds.js';
import { transactionRoutes } from './routes/transactions.js';
import { statsRoutes } from './routes/stats.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);
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
app.use('/api/stats', statsRoutes);

// Error handling
app.use(errorHandler);

export default app;
