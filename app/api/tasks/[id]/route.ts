import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { taskSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, params.id), eq(tasks.userId, userId)))
      .limit(1);
    if (!row) return notFound("Task");
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
    const parsed = taskSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .update(tasks)
      .set(parsed.data)
      .where(and(eq(tasks.id, params.id), eq(tasks.userId, userId)))
      .returning();
    if (!row) return notFound("Task");
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
      .delete(tasks)
      .where(and(eq(tasks.id, params.id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });
    if (!row) return notFound("Task");
    return ok({ deleted: row.id });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
