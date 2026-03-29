// Vercel serverless function — wraps the Express app
// Env vars come from Vercel dashboard (not .env file)
import app from '../server/src/app.js';

export default app;
