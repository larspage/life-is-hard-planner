import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, ok, serverError } from "@/lib/api";
import { taskSchema } from "@/lib/validation";

export async function GET(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const roleId = url.searchParams.get("roleId");
    const quadrant = url.searchParams.get("quadrant");

    const filters = [eq(tasks.userId, userId)];
    if (
      status === "TODO" ||
      status === "SCHEDULED" ||
      status === "IN_PROGRESS" ||
      status === "COMPLETE"
    ) {
      filters.push(eq(tasks.status, status));
    }
    if (roleId) filters.push(eq(tasks.roleId, roleId));
    if (
      quadrant === "I" ||
      quadrant === "II" ||
      quadrant === "III" ||
      quadrant === "IV"
    ) {
      filters.push(eq(tasks.quadrant, quadrant));
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...filters))
      .orderBy(asc(tasks.createdAt));
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
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .insert(tasks)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) return serverError(new Error("Insert returned no row"));
    return ok(row, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
