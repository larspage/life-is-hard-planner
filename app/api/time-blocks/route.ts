import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { badRequest, ok, serverError } from "@/lib/api";
import { timeBlockSchema } from "@/lib/validation";

export async function GET(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const filters = [eq(timeBlocks.userId, userId)];
    if (dateParam) {
      const date = new Date(dateParam);
      if (Number.isNaN(date.getTime()))
        return badRequest({ date: "invalid date" });
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filters.push(gte(timeBlocks.startTime, start));
      filters.push(lt(timeBlocks.startTime, end));
    }
    const rows = await db
      .select()
      .from(timeBlocks)
      .where(and(...filters))
      .orderBy(asc(timeBlocks.startTime));
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
    const parsed = timeBlockSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const [row] = await db
      .insert(timeBlocks)
      .values({ ...parsed.data, userId })
      .returning();
    if (!row) return serverError(new Error("Insert returned no row"));
    return ok(row, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
