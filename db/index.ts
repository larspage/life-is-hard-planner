import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var __lifeosDb: DrizzleDatabase | undefined;
  // eslint-disable-next-line no-var
  var __lifeosSql: ReturnType<typeof postgres> | undefined;
}

function initializeDb(): DrizzleDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it in your env or .env.local before importing the db client.",
    );
  }
  const sql = postgres(url, { max: 10 });
  const db = drizzle(sql, { schema });
  globalThis.__lifeosSql = sql;
  return db;
}

function getDb(): DrizzleDatabase {
  if (!globalThis.__lifeosDb) {
    globalThis.__lifeosDb = initializeDb();
  }
  return globalThis.__lifeosDb;
}

/**
 * Lazy Drizzle proxy. Module import does NOT trigger a DB connection — the
 * first call to any method (e.g. `db.select()`, `db.insert(...)`) will
 * initialize the connection. This lets `next build` collect page data without
 * requiring DATABASE_URL to be set.
 *
 * In tests, `vi.mock('@/db', () => ({ db: mockDb }))` replaces this entire
 * module, so the proxy is never constructed.
 */
export const db: DrizzleDatabase = new Proxy({} as DrizzleDatabase, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof DrizzleDatabase];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export async function closeDb(): Promise<void> {
  const sql = globalThis.__lifeosSql;
  if (sql) {
    await sql.end({ timeout: 5 });
  }
  globalThis.__lifeosDb = undefined;
  globalThis.__lifeosSql = undefined;
}

export { schema };
