import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks, tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { TimeBlockRow, TimeBlocksForm } from "./time-blocks-form";

export const metadata = { title: "Time blocks — LifeOS" };

type TimeBlockRowData = {
  id: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export default async function TimeBlocksPage() {
  const userId = await requireUserId();
  const rows = (
    await withUserContext(userId, async (tx) => {
      return tx
        .select({
          id: timeBlocks.id,
          taskId: timeBlocks.taskId,
          date: timeBlocks.date,
          startTime: timeBlocks.startTime,
          endTime: timeBlocks.endTime,
        })
        .from(timeBlocks)
        .where(eq(timeBlocks.userId, userId))
        .orderBy(asc(timeBlocks.startTime));
    })
  ).map((b) => ({
    id: b.id,
    taskId: b.taskId,
    date: b.date.toISOString(),
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
  })) as TimeBlockRowData[];

  const taskOpts = (
    await withUserContext(userId, async (tx) =>
      tx
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .orderBy(asc(tasks.title)),
    )
  ).map((t) => ({ id: t.id, title: t.title ?? "" }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Time blocks</h1>
      <TimeBlocksForm tasks={taskOpts} />
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No time blocks yet. Use the form above to schedule your first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => (
            <TimeBlockRow key={b.id} block={b} tasks={taskOpts} />
          ))}
        </ul>
      )}
    </div>
  );
}
