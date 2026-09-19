import { and, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { values } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { notFound, ok } from "@/lib/api";
import { InternalError, ValidationError, withErrorHandling } from "@/lib/errors";
import { valueSchema } from "@/lib/validation";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .select()
        .from(values)
        .where(and(eq(values.id, params.id), eq(values.userId, userId)))
        .limit(1);
      if (!row) return notFound("Value");
      return ok(row);
    });
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = valueSchema.partial().safeParse(body);
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
        .update(values)
        .set(parsed.data)
        .where(and(eq(values.id, params.id), eq(values.userId, userId)))
        .returning();
      if (!row) return notFound("Value");
      return ok(row);
    });
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .delete(values)
        .where(and(eq(values.id, params.id), eq(values.userId, userId)))
        .returning({ id: values.id });
      if (!row) return notFound("Value");
      return ok({ deleted: row.id });
    });
  },
);
