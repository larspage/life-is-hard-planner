import { and, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { notFound, ok } from "@/lib/api";
import { InternalError, ValidationError, withErrorHandling } from "@/lib/errors";
import { goalSchema } from "@/lib/validation";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
        .limit(1);
      if (!row) return notFound("Goal");
      return ok(row);
    });
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = goalSchema.partial().safeParse(body);
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
        .update(goals)
        .set(parsed.data)
        .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
        .returning();
      if (!row) return notFound("Goal");
      return ok(row);
    });
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .delete(goals)
        .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
        .returning({ id: goals.id });
      if (!row) return notFound("Goal");
      return ok({ deleted: row.id });
    });
  },
);
