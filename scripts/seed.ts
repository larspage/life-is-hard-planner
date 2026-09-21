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
    const result = await db.execute(sql`
      INSERT INTO users (
        email,
        password_hash,
        subscription_tier,
        trial_expires_at,
        subscription_expires_at,
        uploaded_bytes
      )
      VALUES (
        ${spec.email},
        ${passwordHash},
        ${spec.subscriptionTier},
        ${spec.trialExpiresAt},
        ${spec.subscriptionExpiresAt},
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
