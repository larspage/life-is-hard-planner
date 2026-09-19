import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { timeBlockSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
      .limit(1);
    if (!row) return notFound("TimeBlock");
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
    const parsed = timeBlockSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .update(timeBlocks)
      .set(parsed.data)
      .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
      .returning();
    if (!row) return notFound("TimeBlock");
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
      .delete(timeBlocks)
      .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
      .returning({ id: timeBlocks.id });
    if (!row) return notFound("TimeBlock");
    return ok({ deleted: row.id });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
