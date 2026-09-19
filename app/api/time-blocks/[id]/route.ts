import { and, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { notFound, ok } from "@/lib/api";
import { InternalError, ValidationError, withErrorHandling } from "@/lib/errors";
import { timeBlockSchema } from "@/lib/validation";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .select()
        .from(timeBlocks)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .limit(1);
      if (!row) return notFound("TimeBlock");
      return ok(row);
    });
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = timeBlockSchema.partial().safeParse(body);
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
        .update(timeBlocks)
        .set(parsed.data)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .returning();
      if (!row) return notFound("TimeBlock");
      return ok(row);
    });
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .delete(timeBlocks)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .returning({ id: timeBlocks.id });
      if (!row) return notFound("TimeBlock");
      return ok({ deleted: row.id });
    });
  },
);
