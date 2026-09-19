import { and, asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok } from "@/lib/api";
import { InternalError, InvalidParameterError, withErrorHandling } from "@/lib/errors";
import { taskSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: Request) => {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const roleId = url.searchParams.get("roleId");
  const quadrant = url.searchParams.get("quadrant");

  return withUserContext(userId, async (tx) => {
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

    const rows = await tx
      .select()
      .from(tasks)
      .where(and(...filters))
      .orderBy(asc(tasks.createdAt));
    return ok(rows);
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
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
      .insert(tasks)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) throw new InternalError("Insert returned no row");
    return ok(row, { status: 201 });
  });
});
