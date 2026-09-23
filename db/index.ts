import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var __lifeosDb: DrizzleDatabase | undefined;
  // eslint-disable-next-line no-var
  var __lifeosSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __lifeosUserId: string | undefined;
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
 *
 * Per ADR-008: every transaction must run with `app.user_id` set so RLS
 * policies can filter by user. The application code calls
 * `withUserContext(userId, async () => { ... queries ... })` from inside
 * route handlers after `requireUserId()`. The GUC is set via `SET LOCAL`
 * inside a transaction, so it scopes to that transaction only and is
 * discarded after commit.
 */
export const db: DrizzleDatabase = new Proxy({} as DrizzleDatabase, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof DrizzleDatabase];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/**
 * Run a callback inside a transaction with `app.user_id` set to the
 * caller's user id. RLS policies read from this GUC; without it, every
 * query against a user-owned table returns zero rows.
 *
 * Usage:
 *   const rows = await withUserContext(userId, async (tx) => {
 *     return tx.select().from(roles).where(eq(roles.userId, userId)).execute();
 *   });
 *
 * The callback receives the transaction handle; queries must run against
 * that handle (not the top-level `db`) so the GUC scopes correctly.
 *
 * Implementation note: we use `SELECT set_config('app.user_id', $1, true)`
 * rather than `SET LOCAL app.user_id = $1`. The `SET LOCAL` form rejects
 * bound parameters (Postgres reports `syntax error at or near "$1"`) —
 * `SET` is a utility command where parameter substitution isn't valid
 * grammar. `set_config(key, value, is_local)` is a regular function call,
 * so the driver can bind `$1` safely, and the third argument `true` makes
 * the setting transaction-local, matching the original `SET LOCAL`
 * intent.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: DrizzleDatabase) => Promise<T>,
): Promise<T> {
  const real = getDb();
  return real.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

export async function closeDb(): Promise<void> {
  const sql = globalThis.__lifeosSql;
  if (sql) {
    await sql.end({ timeout: 5 });
  }
  globalThis.__lifeosDb = undefined;
  globalThis.__lifeosSql = undefined;
}

export { schema };
