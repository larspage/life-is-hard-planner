import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { values } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { valueSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(values)
      .where(and(eq(values.id, params.id), eq(values.userId, userId)))
      .limit(1);
    if (!row) return notFound("Value");
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
    const parsed = valueSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .update(values)
      .set(parsed.data)
      .where(and(eq(values.id, params.id), eq(values.userId, userId)))
      .returning();
    if (!row) return notFound("Value");
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
      .delete(values)
      .where(and(eq(values.id, params.id), eq(values.userId, userId)))
      .returning({ id: values.id });
    if (!row) return notFound("Value");
    return ok({ deleted: row.id });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
