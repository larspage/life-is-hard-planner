import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, ok, serverError } from "@/lib/api";
import { goalSchema } from "@/lib/validation";

export async function GET(): Promise<Response> {
  try {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(asc(goals.createdAt));
    return ok(rows);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .insert(goals)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) return serverError(new Error("Insert returned no row"));
    return ok(row, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
