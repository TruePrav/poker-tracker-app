import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getConnectionConfig() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL) is required.');
  }
  const parsed = new URL(connectionString);
  const sslmode = parsed.searchParams.get('sslmode');
  // Handle TLS from the pg client config below instead of URL params.
  parsed.searchParams.delete('sslmode');

  // Local databases (or explicit sslmode=disable) don't speak TLS;
  // remote ones (Supabase) need TLS without CA verification.
  const host = parsed.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
  const ssl: false | { rejectUnauthorized: boolean } =
    sslmode === 'disable' || isLocal ? false : { rejectUnauthorized: false };

  return { connectionString: parsed.toString(), ssl };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(getConnectionConfig());
  }
  return pool;
}

export async function query(text: string, params: any[] = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
