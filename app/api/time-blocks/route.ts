import { and, asc, eq, gte, lt } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok } from "@/lib/api";
import {
  InternalError,
  ValidationError,
  withErrorHandling,
} from "@/lib/errors";
import { timeBlockSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: Request) => {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  return withUserContext(userId, async (tx) => {
    const filters = [eq(timeBlocks.userId, userId)];
    if (dateParam) {
      const date = new Date(dateParam);
      if (Number.isNaN(date.getTime())) {
        throw new ValidationError("Invalid date parameter", {
          date: "invalid date",
        });
      }
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filters.push(gte(timeBlocks.startTime, start));
      filters.push(lt(timeBlocks.startTime, end));
    }
    const rows = await tx
      .select()
      .from(timeBlocks)
      .where(and(...filters))
      .orderBy(asc(timeBlocks.startTime));
    return ok(rows);
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  const parsed = timeBlockSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Request body did not validate",
      parsed.error.flatten(),
    );
  }
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .insert(timeBlocks)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) throw new InternalError("Insert returned no row");
    return ok(row, { status: 201 });
  });
});
