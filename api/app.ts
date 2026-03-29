import express from 'express';
import cors from 'cors';
import { playerRoutes } from './routes/players';
import { tournamentRoutes } from './routes/tournaments';
import { tableRoutes } from './routes/tables';
import { blindRoutes } from './routes/blinds';
import { transactionRoutes } from './routes/transactions';
import { statsRoutes } from './routes/stats';
import { errorHandler } from './middleware/errorHandler';

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
