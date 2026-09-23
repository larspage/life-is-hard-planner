import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { goals, roles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { GoalRow, GoalsForm } from "./goals-form";
import { EntityIntro } from "../_components/entity-intro";

export const metadata = { title: "Goals — LifeOS" };

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  horizon: "LONG_TERM" | "MID_TERM";
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  targetDate: string | null;
  roleId: string | null;
  roleName: string | null;
};

type RoleRow = { id: string; name: string };

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goalRows = (
    await withUserContext(userId, async (tx) => {
      return tx
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
    })
  ).map((g) => ({
    ...g,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
  })) as GoalRow[];
  const roleRows = await withUserContext<RoleRow[]>(userId, async (tx) => {
    return tx
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.userId, userId))
      .orderBy(asc(roles.priorityWeight), asc(roles.createdAt));
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <EntityIntro
        title="What are goals?"
        description="Goals are outcomes you commit to within a role. Long-term goals are your 1–3 year bets; mid-term goals are the 1–3 month checkpoints that make the long ones feel achievable. Attach every goal to a role so it has somewhere to live."
        examples={[
          "Become a Staff Engineer (Role: Engineer) — long term",
          "Ship the v2 billing rewrite by Q2 (Role: Engineer) — mid term",
          "Read 12 books this year (Role: Self) — long term",
        ]}
      />
      <GoalsForm roles={roleRows} />
      {goalRows.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No goals yet. Use the form above to create your first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {goalRows.map((g) => (
            <GoalRow key={g.id} goal={g} roles={roleRows} />
          ))}
        </ul>
      )}
    </div>
  );
}
