/**
 * Environment variable parser. Validates that every required key is present
 * at startup. Throws `ValidationError` on miss so the route handler mapper
 * returns a 400 — but in practice the parser runs at module-load time, so a
 * missing key fails the deploy before any request lands.
 *
 * Per ADR-009 (typed errors) and the I4 env-validation test spec.
 */

import { z } from "zod";
import { ValidationError } from "./errors";

const envSchema = z.object({
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
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const flat = result.error.flatten();
    throw new ValidationError(
      "Environment is missing required keys",
      flat.fieldErrors,
    );
  }

  // Production-only sanity checks. These don't fail the parse but throw if
  // a production env is misconfigured.
  if (result.data.NODE_ENV === "production") {
    if (result.data.ENABLE_CREDENTIALS_PROVIDER) {
      throw new ValidationError(
        "ENABLE_CREDENTIALS_PROVIDER must be false in production",
        {
          ENABLE_CREDENTIALS_PROVIDER: result.data.ENABLE_CREDENTIALS_PROVIDER,
        },
      );
    }
    if (!result.data.GITHUB_ID || !result.data.GITHUB_SECRET) {
      throw new ValidationError(
        "GITHUB_ID and GITHUB_SECRET are required in production",
        {
          GITHUB_ID: !!result.data.GITHUB_ID,
          GITHUB_SECRET: !!result.data.GITHUB_SECRET,
        },
      );
    }
  }

  return result.data;
}

export const env = parseEnv();
