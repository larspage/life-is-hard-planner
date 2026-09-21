/**
 * NextAuth v4 configuration.
 *
 * Auth strategy: JWT-only (no Drizzle adapter — keeps the User table minimal
 * for now; expanding to OAuth account linking means adding `accounts`,
 * `sessions`, `verification_tokens` tables later).
 *
 * Providers:
 *   - GitHub OAuth in all environments (production primary).
 *   - Credentials provider ONLY when:
 *       (a) LIFEOS_DEPLOYMENT_MODE !== 'production', AND
 *       (b) ENABLE_CREDENTIALS_PROVIDER === 'true'.
 *     The credentials provider seeds an env-bypass for local development and
 *     for staging so Larry can log in without configuring GitHub OAuth.
 *     Mirrors the MrBrooks Admin Portal `lib/auth.ts` pattern.
 *
 *     In `staging` mode, a magic password (`STAGING_MAGIC_PASSWORD`) bypasses
 *     bcrypt — the user is looked up by email alone. This powers the
 *     user-select UI on `/login` so internal testers click a name instead of
 *     typing credentials. The bypass is gated on LIFEOS_DEPLOYMENT_MODE ===
 *     'staging'; in any other mode the magic password is treated as a normal
 *     password (and would not match any real password hash).
 *
 * Session enrichment: the `jwt` and `session` callbacks promote `user.id` to
 * `token.userId` and back to `session.user.id` so route handlers can pull the
 * signed-in user via `await auth()`.
 *
 * 60-day trial downgrade (per original SPEC): handled by a post-signIn hook in
 * `lib/auth.ts#afterSignIn` that downgrades `subscriptionTier` from TRIAL to
 * FREE when `trialExpiresAt` is in the past. Subscription itself is deferred
 * to a future phase; the column exists so the migration doesn't need to
 * add it back when the phase lands.
 */

import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AuthError } from "./errors";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const STAGING_MAGIC_PASSWORD = "__lifeos_staging__";

const deploymentMode = process.env.LIFEOS_DEPLOYMENT_MODE ?? "production";
const credsEnabled =
  deploymentMode !== "production" &&
  process.env.ENABLE_CREDENTIALS_PROVIDER === "true";

export const authConfig: NextAuthOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    ...(credsEnabled
      ? [
          Credentials({
            name: "Dev credentials",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(raw) {
              const parsed = credentialsSchema.safeParse(raw);
              if (!parsed.success) return null;
              const user = await db
                .select()
                .from(users)
                .where(eq(users.email, parsed.data.email))
                .limit(1);
              const found = user[0];
              if (!found) return null;

              // Staging bypass: magic password + staging mode = sign in as
              // the user without bcrypt. The bypass is gated on both halves
              // — a magic password alone never matches any real hash.
              const isStagingBypass =
                deploymentMode === "staging" &&
                parsed.data.password === STAGING_MAGIC_PASSWORD;

              if (!isStagingBypass) {
                const ok = await bcrypt.compare(
                  parsed.data.password,
                  found.passwordHash,
                );
                if (!ok) return null;
              }

              return {
                id: found.id,
                email: found.email,
                name: found.email,
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: { id?: string } }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (typeof token.userId === "string" && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }: { user?: { id?: string } }) {
      // 60-day trial downgrade: if a user's trial has expired, downgrade the
      // subscription tier from TRIAL to FREE on every sign-in. This is the
      // equivalent of the original Express `apps/api/src/routes/auth.ts`
      // lines 130–136 logic, ported to NextAuth's event hook.
      if (!user?.id) return;
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const found = rows[0];
      if (!found) return;
      if (
        found.subscriptionTier === "TRIAL" &&
        found.trialExpiresAt &&
        found.trialExpiresAt.getTime() < Date.now()
      ) {
        await db
          .update(users)
          .set({ subscriptionTier: "FREE" })
          .where(eq(users.id, found.id));
      }
    },
  },
};

export const handler = NextAuth(authConfig);

export async function auth() {
  return await getServerSession(authConfig);
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Sign in to perform this action");
  }
  return session.user.id;
}
