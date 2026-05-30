import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazy singleton — evaluated on first query, not at module load time.
// This prevents build failures when DATABASE_URL is absent in CI/build environments.
let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is required but not set. ' +
        'Add it to .env.local (development) or Vercel project settings (production).'
      );
    }
    _sql = neon(url);
  }
  return _sql;
}

// Thin wrapper that forwards tagged-template calls to the lazy singleton.
// Usage: await sql`SELECT ...` — identical to the neon() return value.
const sqlTarget = (() => undefined) as unknown as NeonQueryFunction<false, false>;

export const sql: NeonQueryFunction<false, false> = new Proxy(sqlTarget, {
  apply(_target, _thisArg, args) {
    return (getDb() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
