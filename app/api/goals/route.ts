import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok } from "@/lib/api";
import { InternalError, InvalidParameterError, withErrorHandling } from "@/lib/errors";
import { goalSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const userId = await requireUserId();
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(asc(goals.createdAt));
    return ok(rows);
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "bad_request",
          message: "Request body did not validate",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .insert(goals)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) throw new InternalError("Insert returned no row");
    return ok(row, { status: 201 });
  });
});
