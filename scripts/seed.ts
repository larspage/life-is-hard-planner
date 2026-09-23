/**
 * Idempotent seed for local + staging environments.
 *
 * Refuses to run when LIFEOS_DEPLOYMENT_MODE === "production" — production
 * seeds come from real sign-ups via GitHub OAuth, never from a script.
 *
 * Creates one user per subscription tier so testers can exercise every
 * branch of the trial-downgrade logic in `lib/auth.ts` without having to
 * backdate `trialExpiresAt` by hand:
 *
 *   larry+trial@lifeos.app       TRIAL  trial expires in 30 days
 *   larry+expired@lifeos.app     TRIAL  trial expired yesterday (forces
 *                                          downgrade to FREE on next sign-in)
 *   larry+free@lifeos.app        FREE   no trial, no subscription
 *   larry+premium@lifeos.app     PREMIUM active paid subscription
 *
 * Each row is upserted on email so the script is safe to re-run.
 *
 * Usage:
 *   npm run seed                  (reads DATABASE_URL from .env.local)
 *   DATABASE_URL=... npm run seed (CI / one-off)
 */

import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db, closeDb } from "../db";
import { users } from "../db/schema";

const DEPLOYMENT_MODE = process.env.LIFEOS_DEPLOYMENT_MODE ?? "production";
const SEED_PASSWORD = "lifeos-seed-password";

type SeedSpec = {
  email: string;
  subscriptionTier: "FREE" | "TRIAL" | "PREMIUM";
  trialExpiresAt: Date | null;
  subscriptionExpiresAt: Date | null;
};

const NOW = Date.now();
const DAYS = (n: number) => new Date(NOW + n * 24 * 60 * 60 * 1000);

const SEEDS: SeedSpec[] = [
  {
    email: "larry+trial@lifeos.app",
    subscriptionTier: "TRIAL",
    trialExpiresAt: DAYS(30),
    subscriptionExpiresAt: null,
  },
  {
    email: "larry+expired@lifeos.app",
    subscriptionTier: "TRIAL",
    trialExpiresAt: DAYS(-1),
    subscriptionExpiresAt: null,
  },
  {
    email: "larry+free@lifeos.app",
    subscriptionTier: "FREE",
    trialExpiresAt: null,
    subscriptionExpiresAt: null,
  },
  {
    email: "larry+premium@lifeos.app",
    subscriptionTier: "PREMIUM",
    trialExpiresAt: null,
    subscriptionExpiresAt: DAYS(365),
  },
];

async function main(): Promise<void> {
  if (DEPLOYMENT_MODE === "production") {
    throw new Error(
      `Refusing to seed in production mode (LIFEOS_DEPLOYMENT_MODE="${DEPLOYMENT_MODE}").`,
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  console.log(
    `Seeding ${SEEDS.length} users into ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")} (mode=${DEPLOYMENT_MODE})...`,
  );

  for (const spec of SEEDS) {
    // Postgres `INSERT ... ON CONFLICT ... DO UPDATE` is the cleanest
    // idempotent upsert here — Drizzle's `onConflictDoUpdate` requires a
    // unique target and `users_email_idx` is the natural one. We use raw
    // SQL because Drizzle's helper doesn't natively support the
    // `excluded.column` form on the columns we want to refresh.
    //
    // Dates go in as ISO strings — the postgres-js driver does not
    // accept Date objects inside `sql` tagged templates (it tries to
    // call Buffer.byteLength on the value). The DB column is timestamptz,
    // so Postgres parses the ISO string on the way in.
    //
    // RLS note (ADR-019): the `users` table has FORCE ROW LEVEL
    // SECURITY on with a `WITH CHECK` clause that the inserted row's id
    // must equal `app.user_id`. We pre-generate the UUID here so we
    // can set `app.user_id` to it for the duration of the insert,
    // then proceed. For the ON CONFLICT branch (idempotent re-seed),
    // we use the existing row's id from RETURNING. The whole upsert
    // runs inside a transaction so the GUC is transaction-local.
    const generatedId = randomUUID();
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.user_id', ${generatedId}, true)`,
      );
      return tx.execute(sql`
        INSERT INTO users (
          id,
          email,
          password_hash,
          subscription_tier,
          trial_expires_at,
          subscription_expires_at,
          uploaded_bytes
        )
        VALUES (
          ${generatedId},
          ${spec.email},
          ${passwordHash},
          ${spec.subscriptionTier},
          ${spec.trialExpiresAt?.toISOString() ?? null},
          ${spec.subscriptionExpiresAt?.toISOString() ?? null},
          0
        )
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          subscription_tier = EXCLUDED.subscription_tier,
          trial_expires_at = EXCLUDED.trial_expires_at,
          subscription_expires_at = EXCLUDED.subscription_expires_at,
          updated_at = NOW()
        RETURNING id, email;
      `);
    });

    console.log(`  ✓ ${spec.email} (${spec.subscriptionTier})`);
    // Touch `result` so the linter doesn't drop the unused variable when
    // the driver returns an array we don't need.
    void result;
  }

  console.log("");
  console.log(`Seed password for all four users: ${SEED_PASSWORD}`);
  console.log("Done.");
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
