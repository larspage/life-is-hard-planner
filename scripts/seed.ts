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
    // Two-step upsert so re-seeding preserves user ids.
    //
    // Why: if we used `INSERT ... ON CONFLICT (email) DO UPDATE`
    // directly with a freshly-randomized id, the conflict branch
    // would rewrite the existing row's id (because id is included
    // in the VALUES), rotating every user's UUID on every seed.
    // That invalidates any active JWT whose `userId` claim pointed
    // at the old id, so the next /api/* call from that session would
    // hit a FK violation on a user-scoped table (roles, tasks,
    // time_blocks, etc.) and return 500.
    //
    // Step 1: probe whether the email already exists and capture its
    // id. If so, we set app.user_id to the EXISTING id (the
    // user_isolation RLS policy requires that). If not, we generate
    // a new id.
    //
    // Step 2: insert with that id, on conflict (email) refresh only
    // the columns we actually want to keep current (password_hash,
    // subscription_tier, trial_expires_at, subscription_expires_at,
    // updated_at) — id and email are left alone. The returned row is
    // the existing or newly-created one, both with the SAME id.
    //
    // Dates go in as ISO strings — the postgres-js driver does not
    // accept Date objects inside `sql` tagged templates (it tries to
    // call Buffer.byteLength on the value). The DB column is
    // timestamptz, so Postgres parses the ISO string on the way in.
    //
    // RLS note (ADR-019): the `users` table has FORCE ROW LEVEL
    // SECURITY on. The probe runs as the seed role, which can read
    // its own row when app.user_id is set (and 0 rows when unset —
    // see the auth_email_lookup policy in 0002). For a fresh insert
    // we set app.user_id to the new id; for an existing email we
    // set it to the existing row's id.
    const result = await db.transaction(async (tx) => {
      // Probe for an existing row under the auth_email_lookup policy
      // (see ADR-019 + 0002_force_row_level_security.sql). Without
      // that GUC, the probe would be blocked by user_isolation and
      // we'd always see 0 rows. Reset the GUC after the probe so the
      // INSERT below only sees the user_isolation policy.
      await tx.execute(
        sql`SELECT set_config('app.auth_email_lookup', ${spec.email}, true)`,
      );
      const existing = await tx.execute(sql`
        SELECT id FROM users WHERE email = ${spec.email} LIMIT 1;
      `);
      await tx.execute(
        sql`SELECT set_config('app.auth_email_lookup', '', true)`,
      );

      const existingId = (existing as unknown as Array<{ id: string }>)[0]?.id;

      const userId = existingId ?? randomUUID();
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);

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
          ${userId},
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
