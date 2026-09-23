import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { withUserContext } from "@/db";
import { roles, goals, tasks, timeBlocks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";

export const metadata = { title: "Dashboard — LifeOS" };

export default async function DashboardPage() {
  const userId = await requireUserId();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const counts = await withUserContext(userId, async (tx) => {
    const [roleRows, goalRows, taskRows, blockRows] = await Promise.all([
      tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.userId, userId))
        .then((r) => r.length),
      tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.status, "ACTIVE")))
        .then((r) => r.length),
      tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.status, "TODO")))
        .then((r) => r.length),
      tx
        .select({ id: timeBlocks.id })
        .from(timeBlocks)
        .where(
          and(
            eq(timeBlocks.userId, userId),
            gte(timeBlocks.startTime, start),
            lt(timeBlocks.startTime, end),
          ),
        )
        .then((r) => r.length),
    ]);
    return {
      roleCount: roleRows,
      goalCount: goalRows,
      taskCount: taskRows,
      todayBlocks: blockRows,
    };
  });

  const { roleCount, goalCount, taskCount, todayBlocks } = counts;

  return (
    <div className="stack stack--lg">
      <section>
        <h1 style={{ margin: 0 }}>Welcome back.</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Plan with purpose. Big rocks first.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <Stat label="Roles" value={roleCount} href="/roles" />
        <Stat label="Active goals" value={goalCount} href="/goals" />
        <Stat label="Open tasks" value={taskCount} href="/tasks" />
        <Stat
          label="Time blocks today"
          value={todayBlocks}
          href="/time-blocks"
        />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Get started</h2>
        <ol
          style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)" }}
        >
          <li>Define a role (Parent, Engineer, Self).</li>
          <li>Attach a goal to that role.</li>
          <li>Pick 2–3 Quadrant II tasks as Big Rocks this week.</li>
          <li>Schedule time blocks for each Big Rock.</li>
        </ol>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      className="card"
      href={href}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <div className="muted" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800 }}>{value}</div>
    </Link>
  );
}
