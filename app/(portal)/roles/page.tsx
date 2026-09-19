import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { roles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Roles — LifeOS" };

export default async function RolesPage() {
  const userId = await requireUserId();
  const rows = await withUserContext(userId, async (tx) => {
    return tx
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        priorityWeight: roles.priorityWeight,
        color: roles.color,
      })
      .from(roles)
      .where(eq(roles.userId, userId))
      .orderBy(asc(roles.priorityWeight), asc(roles.createdAt));
  });

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h2 style={{ marginTop: 0 }}>No roles yet</h2>
        <p className="muted">
          Roles are the people-you-are: Parent, Engineer, Self. Goals and tasks
          attach to roles for context.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Add a role via <code>POST /api/roles</code>. CRUD UI lands in beta.
        </p>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <h1 style={{ margin: 0 }}>Roles</h1>
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0 }}
        className="stack"
      >
        {rows.map((r) => (
          <li key={r.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: r.color,
                      marginRight: 8,
                      verticalAlign: "middle",
                    }}
                    aria-hidden
                  />
                  {r.name}
                </strong>
                {r.description && (
                  <p
                    className="muted"
                    style={{ margin: "6px 0 0", fontSize: 14 }}
                  >
                    {r.description}
                  </p>
                )}
              </div>
              <span className="badge">Priority {r.priorityWeight}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
