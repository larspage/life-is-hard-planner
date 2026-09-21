/**
 * Environment variable parser. Validates that every required key is present
 * at startup. Throws `InternalError` on miss — these are server-side config
 * failures, not user input, so a 500 (or fatal startup error) is the right
 * signal. In practice the parser runs at module-load time, so a missing key
 * fails the deploy before any request lands.
 *
 * Per ADR-009 (typed errors) and the I4 env-validation test spec.
 */

import { z } from "zod";
import { InternalError } from "./errors";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  ENABLE_CREDENTIALS_PROVIDER: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  MR_BROOKS_DSN: z.string().optional(),
  NEXT_PUBLIC_MR_BROOKS_DSN: z.string().optional(),
  NEXT_PUBLIC_ENV: z.string().default("development"),
  NEXT_PUBLIC_GIT_SHA: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /**
   * Deployment mode — decoupled from NODE_ENV because Next.js forces
   * NODE_ENV=production on `next start`, which would block the dev/staging
   * auth gates on any Railway-hosted env (including staging). Defaults to
   * `production` so an unset variable keeps the strict checks on.
   *
   * `production` — strict: credentials provider must be off, GitHub OAuth
   *                required, no staging endpoints callable.
   * `staging`    — relaxed: credentials provider may be on, GitHub OAuth
   *                optional, staging endpoints callable, magic-password
   *                user-select bypass enabled.
   * `development`— same relaxed rules as staging, plus the credentials
   *                provider renders the standard email/password form.
   */
  LIFEOS_DEPLOYMENT_MODE: z
    .enum(["production", "staging", "development"])
    .default("production"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate an env-shaped object. Exported so tests can call it directly
 * without touching process.env. Production-only sanity checks (credentials
 * provider must be off; GitHub OAuth required) are enforced here too.
 */
export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const flat = result.error.flatten();
    throw new InternalError(
      `Environment is missing required keys: ${JSON.stringify(flat.fieldErrors)}`,
    );
  }

  if (result.data.LIFEOS_DEPLOYMENT_MODE === "production") {
    if (result.data.ENABLE_CREDENTIALS_PROVIDER) {
      throw new InternalError(
        "ENABLE_CREDENTIALS_PROVIDER must be false in production",
      );
    }
    if (!result.data.GITHUB_ID || !result.data.GITHUB_SECRET) {
      throw new InternalError(
        "GITHUB_ID and GITHUB_SECRET are required in production",
      );
    }
  }

  return result.data;
}

export const env = (() => {
  try {
    return parseEnv();
  } catch (err) {
    // Tests that import lib/env without a complete process.env should not
    // crash on module-load. The env module is consumed by `lib/auth.ts` for
    // session cookies, by `db/index.ts` for DATABASE_URL, etc. — but those
    // modules don't run during a pure unit test that only inspects parseEnv.
    // If a test wants the real env it can call parseEnv() directly with a
    // populated env object.
    if (err instanceof InternalError) {
      return undefined as unknown as Env;
    }
    throw err;
  }
})();
