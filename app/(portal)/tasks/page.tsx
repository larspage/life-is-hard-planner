import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { tasks, roles, goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { TaskRow, TasksForm } from "./tasks-form";

export const metadata = { title: "Tasks — LifeOS" };

type TaskRowData = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  quadrant: "I" | "II" | "III" | "IV";
  status: "TODO" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETE";
  priorityType: "BIG_ROCK" | "NORMAL";
  energyLevel: number | null;
  roleId: string | null;
  goalId: string | null;
  parentTaskId: string | null;
};

export default async function TasksPage() {
  const userId = await requireUserId();
  const rows = (await withUserContext(userId, async (tx) => {
    return tx
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        duration: tasks.duration,
        quadrant: tasks.quadrant,
        status: tasks.status,
        priorityType: tasks.priorityType,
        energyLevel: tasks.energyLevel,
        roleId: tasks.roleId,
        goalId: tasks.goalId,
        parentTaskId: tasks.parentTaskId,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.createdAt));
  })) as TaskRowData[];

  const roleOpts = (
    await withUserContext(userId, async (tx) =>
      tx
        .select({ id: roles.id, label: roles.name })
        .from(roles)
        .where(eq(roles.userId, userId))
        .orderBy(asc(roles.name)),
    )
  ).map((r) => ({ id: r.id, label: r.label ?? "" }));

  const goalOpts = (
    await withUserContext(userId, async (tx) =>
      tx
        .select({ id: goals.id, label: goals.title })
        .from(goals)
        .where(eq(goals.userId, userId))
        .orderBy(asc(goals.title)),
    )
  ).map((g) => ({ id: g.id, label: g.label ?? "" }));

  const taskOpts = rows.map((t) => ({ id: t.id, label: t.title }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <TasksForm roles={roleOpts} goals={goalOpts} tasks={taskOpts} />
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No tasks yet. Use the form above to add your first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              roles={roleOpts}
              goals={goalOpts}
              tasks={taskOpts}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
