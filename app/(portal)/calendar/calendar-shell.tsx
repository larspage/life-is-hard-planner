"use client";

import { useState } from "react";
import { LifeOSCalendar, type LifeOSCalendarEvent } from "@/lib/calendar/rbc";

type WireEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "time-block" | "event";
};

/**
 * Client-side shell that mounts the RBC wrapper.
 *
 * Responsibilities:
 *   - Hydrate ISO strings from the server into Date objects.
 *   - Hold the active theme (linear/notion/apple) in local state for
 *     the beta cycle. A future revision will read this from
 *     `user_settings.calendar_theme` per ADR-017.
 *   - Surface selection callbacks for the future event-detail modal
 *     (ADR-014's @schedule-x/event-modal stand-in). For now we route
 *     selection into a console log so the click path is observable.
 *
 * Why a separate shell? The RBC wrapper imports compiled CSS, which
 * is a client-only side effect. The route stays a server component so
 * DB queries keep working without an extra /api roundtrip.
 */
export function LifeOSCalendarShell({ events }: { events: WireEvent[] }) {
  const [theme, setTheme] = useState<"linear" | "notion" | "apple">("linear");

  const hydrated: LifeOSCalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    kind: e.kind,
  }));

  return (
    <div className="space-y-3">
      <div
        role="toolbar"
        aria-label="Calendar theme"
        className="flex items-center gap-2 text-sm"
      >
        <span className="text-muted-foreground">Theme:</span>
        {(["linear", "notion", "apple"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            className={
              "rounded-md border px-3 py-1 capitalize " +
              (theme === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background")
            }
          >
            {t}
          </button>
        ))}
      </div>
      <LifeOSCalendar
        events={hydrated}
        theme={theme}
        defaultView="week"
        onSelectEvent={(event) => {
          // Future: open the event-detail modal. For now we surface the
          // selection path so it is observable in dev tools.
          // eslint-disable-next-line no-console
          console.info("[lifeos-calendar] selected event", event.id);
        }}
      />
    </div>
  );
}
