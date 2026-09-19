import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { roleSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, params.id), eq(roles.userId, userId)))
      .limit(1);
    if (!row) return notFound("Role");
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
    const parsed = roleSchema.partial().safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .update(roles)
      .set(parsed.data)
      .where(and(eq(roles.id, params.id), eq(roles.userId, userId)))
      .returning();
    if (!row) return notFound("Role");
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
      .delete(roles)
      .where(and(eq(roles.id, params.id), eq(roles.userId, userId)))
      .returning({ id: roles.id });
    if (!row) return notFound("Role");
    return ok({ deleted: row.id });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
