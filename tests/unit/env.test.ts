import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";
import { InternalError } from "@/lib/errors";

/**
 * Env-validation tests. The parser rejects missing required keys at
 * startup; CI catches env drift before deploy per the I4 spec.
 */

const VALID_DEV_ENV = {
  DATABASE_URL: "postgres://lifeos:lifeos@localhost:5433/lifeos",
  NEXTAUTH_URL: "http://localhost:3042",
  NEXTAUTH_SECRET: "test-secret-do-not-use-in-prod",
  ENABLE_CREDENTIALS_PROVIDER: "true",
  NEXT_PUBLIC_ENV: "development",
  NODE_ENV: "development",
} as const;

describe("parseEnv", () => {
  it("accepts a valid development env", () => {
    const env = parseEnv(VALID_DEV_ENV);
    expect(env.DATABASE_URL).toBe(VALID_DEV_ENV.DATABASE_URL);
    expect(env.ENABLE_CREDENTIALS_PROVIDER).toBe(true);
    expect(env.NODE_ENV).toBe("development");
  });

  it("throws InternalError when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...rest } = VALID_DEV_ENV;
    expect(() => parseEnv(rest)).toThrow(InternalError);
  });

  it("throws InternalError when NEXTAUTH_SECRET is empty", () => {
    expect(() => parseEnv({ ...VALID_DEV_ENV, NEXTAUTH_SECRET: "" })).toThrow(
      InternalError,
    );
  });

  it("throws InternalError when DATABASE_URL is not a URL", () => {
    expect(() =>
      parseEnv({ ...VALID_DEV_ENV, DATABASE_URL: "not-a-url" }),
    ).toThrow(InternalError);
  });

  it("coerces ENABLE_CREDENTIALS_PROVIDER 'false' to boolean false", () => {
    const env = parseEnv({
      ...VALID_DEV_ENV,
      ENABLE_CREDENTIALS_PROVIDER: "false",
    });
    expect(env.ENABLE_CREDENTIALS_PROVIDER).toBe(false);
  });

  it("defaults NODE_ENV to 'development' when absent", () => {
    const env = parseEnv({
      DATABASE_URL: VALID_DEV_ENV.DATABASE_URL,
      NEXTAUTH_URL: VALID_DEV_ENV.NEXTAUTH_URL,
      NEXTAUTH_SECRET: VALID_DEV_ENV.NEXTAUTH_SECRET,
      ENABLE_CREDENTIALS_PROVIDER: VALID_DEV_ENV.ENABLE_CREDENTIALS_PROVIDER,
      NEXT_PUBLIC_ENV: VALID_DEV_ENV.NEXT_PUBLIC_ENV,
    });
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects ENABLE_CREDENTIALS_PROVIDER=true in production", () => {
    expect(() =>
      parseEnv({
        ...VALID_DEV_ENV,
        NODE_ENV: "production",
        ENABLE_CREDENTIALS_PROVIDER: "true",
        GITHUB_ID: "x",
        GITHUB_SECRET: "y",
      }),
    ).toThrow(/ENABLE_CREDENTIALS_PROVIDER must be false in production/);
  });

  it("rejects missing GITHUB_ID/SECRET in production", () => {
    expect(() =>
      parseEnv({
        ...VALID_DEV_ENV,
        NODE_ENV: "production",
        ENABLE_CREDENTIALS_PROVIDER: "false",
      }),
    ).toThrow(/GITHUB_ID and GITHUB_SECRET are required in production/);
  });

  it("accepts a valid production env", () => {
    const env = parseEnv({
      ...VALID_DEV_ENV,
      NODE_ENV: "production",
      ENABLE_CREDENTIALS_PROVIDER: "false",
      GITHUB_ID: "github-id",
      GITHUB_SECRET: "github-secret",
    });
    expect(env.NODE_ENV).toBe("production");
    expect(env.GITHUB_ID).toBe("github-id");
  });
});
