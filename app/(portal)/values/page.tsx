import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { values } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Values — LifeOS" };

export default async function ValuesPage() {
  const userId = await requireUserId();
  const rows = await withUserContext(userId, async (tx) => {
    return tx
      .select({
        id: values.id,
        text: values.text,
        tags: values.tags,
      })
      .from(values)
      .where(eq(values.userId, userId))
      .orderBy(asc(values.createdAt));
  });

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <h2 style={{ marginTop: 0 }}>No values yet</h2>
        <p className="muted">
          Values are the principles that anchor your planning. They cascade into
          role priorities and goal selection.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Add a value via <code>POST /api/values</code>. CRUD UI lands in beta.
        </p>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <h1 style={{ margin: 0 }}>Values</h1>
      <ul
        style={{ listStyle: "none", padding: 0, margin: 0 }}
        className="stack"
      >
        {rows.map((v) => (
          <li key={v.id} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>{v.text}</strong>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(v.tags ?? []).map((t) => (
                  <span key={t} className="badge">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
