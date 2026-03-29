import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import app from './app.js';

// Always resolve .env relative to this file's directory (server/), not cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(__dirname, '..');
dotenv.config({ path: resolve(envDir, '.env') });
dotenv.config({ path: resolve(envDir, '.env.local'), override: true });

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Mahtani Poker Room API running on http://localhost:${PORT}`);
});
