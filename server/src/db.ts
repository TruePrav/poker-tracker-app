import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL) is required.');
  }
  const parsed = new URL(connectionString);
  // Force TLS behavior from the pg client config below instead of URL params.
  parsed.searchParams.delete('sslmode');
  return parsed.toString();
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
    });
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
