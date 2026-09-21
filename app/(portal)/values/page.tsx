import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { values } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ValueRow, ValuesForm } from "./values-form";

export const metadata = { title: "Values — LifeOS" };

type ValueRowData = {
  id: string;
  text: string;
  tags: string[];
};

export default async function ValuesPage() {
  const userId = await requireUserId();
  const rows = (
    await withUserContext(userId, async (tx) => {
      return tx
        .select({ id: values.id, text: values.text, tags: values.tags })
        .from(values)
        .where(eq(values.userId, userId))
        .orderBy(asc(values.createdAt));
    })
  ).map((v) => ({ ...v, tags: v.tags ?? [] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Values</h1>
      <ValuesForm />
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No values yet. Use the form above to add your first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((v) => (
            <ValueRow key={v.id} value={v} />
          ))}
        </ul>
      )}
    </div>
  );
}
