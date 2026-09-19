import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, roles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Goals — LifeOS" };

export default async function GoalsPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: goals.id,
      title: goals.title,
      description: goals.description,
      horizon: goals.horizon,
      status: goals.status,
      targetDate: goals.targetDate,
      roleId: goals.roleId,
      roleName: roles.name,
    })
    .from(goals)
    .leftJoin(roles, eq(goals.roleId, roles.id))
    .where(eq(goals.userId, userId))
    .orderBy(asc(goals.createdAt));

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h2 style={{ marginTop: 0 }}>No goals yet</h2>
        <p className="muted">
          Goals are long- or mid-term outcomes tied to a role.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          CRUD UI lands next. Use the API for now: <code>POST /api/goals</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <h1 style={{ margin: 0 }}>Goals</h1>
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0 }}
        className="stack"
      >
        {rows.map((g) => (
          <li key={g.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>{g.title}</strong>
                {g.description && (
                  <p
                    className="muted"
                    style={{ margin: "6px 0 0", fontSize: 14 }}
                  >
                    {g.description}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="badge">{g.horizon}</span>
                <span
                  className={`badge ${
                    g.status === "ACTIVE"
                      ? "badge--accent"
                      : g.status === "COMPLETED"
                        ? "badge--success"
                        : ""
                  }`}
                >
                  {g.status}
                </span>
                {g.roleName && <span className="badge">{g.roleName}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
