import { asc, eq } from "drizzle-orm";
import { withUserContext } from "@/db";
import { timeBlocks, tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { LifeOSCalendarShell } from "./calendar-shell";
import { EntityIntro } from "../_components/entity-intro";

export const metadata = { title: "Calendar — LifeOS" };

/**
 * Server-component route. Mirrors the (portal)/time-blocks pattern:
 *   - Pull `requireUserId()` once.
 *   - Open a user-scoped Drizzle transaction.
 *   - Map DB rows to ISO strings for the client.
 *   - Hand off to a client-component shell that mounts the RBC wrapper.
 *
 * Per ADR-018 the calendar scope for v0.3.0-beta is *week + day views
 * only* — month view is intentionally absent from the default view
 * ladder on the wrapper side. Resource columns ("Calendar Sets") and
 * the third-party theming pass land in beta follow-ups.
 */
export default async function CalendarPage() {
  const userId = await requireUserId();

  const rows = await withUserContext(userId, async (tx) =>
    tx
      .select({
        id: timeBlocks.id,
        taskId: timeBlocks.taskId,
        taskTitle: tasks.title,
        startTime: timeBlocks.startTime,
        endTime: timeBlocks.endTime,
      })
      .from(timeBlocks)
      .innerJoin(tasks, eq(tasks.id, timeBlocks.taskId))
      .where(eq(timeBlocks.userId, userId))
      .orderBy(asc(timeBlocks.startTime)),
  );

  const events = rows.map((b) => ({
    id: b.id,
    title: b.taskTitle ?? "(untitled task)",
    start: b.startTime.toISOString(),
    end: b.endTime.toISOString(),
    kind: "time-block" as const,
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Week + day views — month view is read-only in beta (ADR-018).
        </p>
      </header>
      <EntityIntro
        title="What is the Calendar?"
        description="The Calendar is the visual surface where your time blocks live. It reads from the same Time Blocks list on the Time blocks page, so anything you schedule there shows up here — and vice versa. Use the theme buttons to switch between linear (flat), notion (cards), and apple (native-grid) views."
        examples={[
          "Week view — the Big Rocks loop. What am I actually doing this week?",
          "Day view — zoom in. Where is the next hour going?",
          "Agenda view — what's left? Filter to TODO tasks only.",
        ]}
      />
      <LifeOSCalendarShell events={events} />
    </div>
  );
}
