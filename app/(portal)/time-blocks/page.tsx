import { and, asc, eq, gte, lt } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks, tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Time blocks — LifeOS" };

export default async function TimeBlocksPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const userId = await requireUserId();

  const dateParam = searchParams.date;
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return (
      <div className="card">
        <p>
          Invalid date — use <code>?date=YYYY-MM-DD</code>.
        </p>
      </div>
    );
  }

  const start = new Date(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const rows = await withUserContext(userId, async (tx) => {
    return tx
      .select({
        id: timeBlocks.id,
        startTime: timeBlocks.startTime,
        endTime: timeBlocks.endTime,
        taskTitle: tasks.title,
        taskQuadrant: tasks.quadrant,
      })
      .from(timeBlocks)
      .leftJoin(tasks, eq(timeBlocks.taskId, tasks.id))
      .where(
        and(
          eq(timeBlocks.userId, userId),
          gte(timeBlocks.startTime, start),
          lt(timeBlocks.startTime, end),
        ),
      )
      .orderBy(asc(timeBlocks.startTime));
  });

  const dateIso = date.toISOString().slice(0, 10);

  return (
    <div className="stack stack--lg">
      <h1 style={{ margin: 0 }}>
        Time blocks for <span className="muted">{dateIso}</span>
      </h1>
      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 36 }}>
          <p className="muted">
            Nothing scheduled. Add one via <code>POST /api/time-blocks</code>.
          </p>
        </div>
      ) : (
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          className="stack"
        >
          {rows.map((b) => (
            <li key={b.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{b.taskTitle ?? "(deleted task)"}</strong>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {b.startTime.toISOString().slice(11, 16)} —{" "}
                    {b.endTime.toISOString().slice(11, 16)} UTC
                  </div>
                </div>
                {b.taskQuadrant && (
                  <span className="badge">Q{b.taskQuadrant}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
