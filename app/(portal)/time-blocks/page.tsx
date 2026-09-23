import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks, tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { TimeBlockRow, TimeBlocksForm } from "./time-blocks-form";
import { EntityIntro } from "../_components/entity-intro";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Time blocks</h1>
      <EntityIntro
        title="What are time blocks?"
        description="Time blocks are when a task gets the calendar. A Q2 Big Rock that's still floating in your task list isn't real until it has a date and a start time. Schedule your Big Rocks first, then let Q1 reactive work fill the gaps."
        examples={[
          "Wed 9:00–10:30 — Outline the v2 billing design doc",
          "Sat 07:00–07:30 — 30-min walk after coffee",
          "Fri 14:00–15:00 — Read chapter 4 of the staff eng book",
        ]}
      />
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
