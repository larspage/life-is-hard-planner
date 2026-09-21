import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, notFound } from "@/lib/api";
import { withErrorHandling } from "@/lib/errors";

/**
 * Staging-only endpoint that lists every user in the DB so the user-select
 * login UI can render one button per seeded account. The route handler is a
 * no-op in production: `notFound()` returns immediately when
 * `LIFEOS_DEPLOYMENT_MODE` is anything other than `staging`. The guard runs
 * before the DB call so a misconfigured prod env can't accidentally leak
 * the user table.
 */
export const GET = withErrorHandling(async () => {
  if (process.env.LIFEOS_DEPLOYMENT_MODE !== "staging") {
    return notFound("staging");
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      subscriptionTier: users.subscriptionTier,
      trialExpiresAt: users.trialExpiresAt,
    })
    .from(users)
    .orderBy(asc(users.email));

  return ok(
    rows.map((r) => ({
      ...r,
      trialExpiresAt: r.trialExpiresAt?.toISOString() ?? null,
    })),
  );
});
