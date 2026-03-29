import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err.message || err);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Related record not found or invalid reference.' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid input format.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
}
