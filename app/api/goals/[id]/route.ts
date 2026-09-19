import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { goalSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
      .limit(1);
    if (!row) return notFound("Goal");
    return ok(row);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = goalSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .update(goals)
      .set(parsed.data)
      .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
      .returning();
    if (!row) return notFound("Goal");
    return ok(row);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .delete(goals)
      .where(and(eq(goals.id, params.id), eq(goals.userId, userId)))
      .returning({ id: goals.id });
    if (!row) return notFound("Goal");
    return ok({ deleted: row.id });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
