import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { tasks, roles, goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { TaskRow, TasksForm } from "./tasks-form";
import { EntityIntro } from "../_components/entity-intro";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <EntityIntro
        title="What are tasks?"
        description="Tasks are the discrete things you'll do this week. Every task belongs to a role and optionally to a goal, and lives in one of four quadrants: Q1 (urgent + important), Q2 (important, not urgent — your Big Rocks), Q3 (urgent, not important), Q4 (neither). Mark the Q2 ones as Big Rocks — those get scheduled first."
        examples={[
          "Outline the v2 billing design doc (Q2, Big Rock, Role: Engineer)",
          "Reply to vendor contract email (Q3, Role: Engineer)",
          "30-min walk after lunch (Q2, Big Rock, Role: Self)",
        ]}
      />
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
