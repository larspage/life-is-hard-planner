import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, roles, goals } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Tasks — LifeOS" };

export default async function TasksPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      duration: tasks.duration,
      quadrant: tasks.quadrant,
      status: tasks.status,
      priorityType: tasks.priorityType,
      roleName: roles.name,
      goalTitle: goals.title,
    })
    .from(tasks)
    .leftJoin(roles, eq(tasks.roleId, roles.id))
    .leftJoin(goals, eq(tasks.goalId, goals.id))
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.createdAt));

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h2 style={{ marginTop: 0 }}>No tasks yet</h2>
        <p className="muted">
          Add a task via <code>POST /api/tasks</code>. The CRUD UI lands next.
        </p>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <h1 style={{ margin: 0 }}>Tasks</h1>
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0 }}
        className="stack"
      >
        {rows.map((t) => (
          <li key={t.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <strong>{t.title}</strong>
                {t.description && (
                  <p
                    className="muted"
                    style={{ margin: "6px 0 0", fontSize: 14 }}
                  >
                    {t.description}
                  </p>
                )}
                <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  {t.duration} min
                  {t.goalTitle && ` · ${t.goalTitle}`}
                  {t.roleName && ` · ${t.roleName}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {t.priorityType === "BIG_ROCK" && (
                  <span className="badge badge--accent">Big rock</span>
                )}
                <span className="badge">Q{t.quadrant}</span>
                <span className="badge">{t.status}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
