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
 *       (a) NODE_ENV !== 'production', AND
 *       (b) ENABLE_CREDENTIALS_PROVIDER === 'true'.
 *     The credentials provider seeds an env-bypass for local development so
 *     Larry can log in without configuring GitHub OAuth. Mirrors the MrBrooks
 *     Admin Portal `lib/auth.ts` pattern.
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

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
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

const isDev = process.env.NODE_ENV !== "production";
const credsEnabled =
  isDev && process.env.ENABLE_CREDENTIALS_PROVIDER === "true";

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
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
              const ok = await bcrypt.compare(
                parsed.data.password,
                found.passwordHash,
              );
              if (!ok) return null;
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
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string" && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
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

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Sign in to perform this action");
  }
  return session.user.id;
}
