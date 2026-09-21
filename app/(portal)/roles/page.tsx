import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { roles } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { RoleRow, RolesForm } from "./roles-form";

export const metadata = { title: "Roles — LifeOS" };

type RoleRowData = {
  id: string;
  name: string;
  description: string | null;
  priorityWeight: number;
  color: string;
};

export default async function RolesPage() {
  const userId = await requireUserId();
  const rows = await withUserContext<RoleRowData[]>(userId, async (tx) => {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Roles</h1>
      <RolesForm roles={rows} />
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No roles yet. Use the form above to add your first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <RoleRow key={r.id} role={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
