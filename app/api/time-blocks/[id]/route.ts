import { and, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { notFound, ok } from "@/lib/api";
import {
  InternalError,
  InvalidParameterError,
  UnprocessableError,
  withErrorHandling,
} from "@/lib/errors";
import { z } from "zod";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .select()
        .from(timeBlocks)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .limit(1);
      if (!row) return notFound("TimeBlock");
      return ok(row);
    });
  },
);

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = z
      .object({
        taskId: z.string().uuid().optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        date: z.coerce.date().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new InvalidParameterError(
        "Request body did not validate",
        parsed.error.flatten(),
      );
    }
    return withUserContext(userId, async (tx) => {
      // Business rule: endTime must be after startTime in the resulting row.
      // If both are present in the patch, check them directly. If only one
      // is present, fetch the existing row and check the combined result.
      const startTime = parsed.data.startTime;
      const endTime = parsed.data.endTime;
      if (startTime && endTime) {
        if (endTime.getTime() <= startTime.getTime()) {
          throw new UnprocessableError("endTime must be after startTime", {
            endTime: "must be after startTime",
          });
        }
      } else if (startTime || endTime) {
        const [existing] = await tx
          .select()
          .from(timeBlocks)
          .where(
            and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)),
          )
          .limit(1);
        if (!existing) return notFound("TimeBlock");
        const resultStart = startTime ?? existing.startTime;
        const resultEnd = endTime ?? existing.endTime;
        if (resultEnd.getTime() <= resultStart.getTime()) {
          throw new UnprocessableError("endTime must be after startTime", {
            endTime: "must be after startTime",
          });
        }
      }

      const [row] = await tx
        .update(timeBlocks)
        .set(parsed.data)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .returning();
      if (!row) return notFound("TimeBlock");
      return ok(row);
    });
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    return withUserContext(userId, async (tx) => {
      const [row] = await tx
        .delete(timeBlocks)
        .where(and(eq(timeBlocks.id, params.id), eq(timeBlocks.userId, userId)))
        .returning({ id: timeBlocks.id });
      if (!row) return notFound("TimeBlock");
      return ok({ deleted: row.id });
    });
  },
);
