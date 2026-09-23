/**
 * react-big-calendar wrapper for LifeOS.
 *
 * This is the single boundary between our code and the RBC library. ADR-018
 * (supersedes ADR-014's views choice) commits us to RBC for v0.3.0-beta
 * onward and to owning the drag layer via `@dnd-kit` rather than inheriting
 * RBC's HTML5-DnD addon (ADR-016 a11y position).
 *
 * Responsibilities of this file:
 *   1. Localizer selection (date-fns; matches the date-fns + date-fns-tz
 *      time-zone decision in ADR-014).
 *   2. Theme-class injection so ADR-017's CSS-variable surface stays the
 *      single source of truth for theming.
 *   3. RBC default props that match SPEC §Calendar UX (week + day views
 *      only in v0.3.0-beta; month view kept read-only via the route).
 *   4. A typed `LifeOSCalendarEvent` shape so callers don't have to repeat
 *      the accessors on every consumer.
 *
 * Drag-and-drop is intentionally NOT applied here. The wrapper exposes
 * `onEventDrop` / `onEventResize` callbacks; the parent route wires them
 * to the `@dnd-kit` overlay. RBC ships an HTML5-DnD addon that we
 * deliberately do not import.
 *
 * CSS: this file imports the compiled `react-big-calendar.css` once. The
 * `app/calendar/rbc-overrides.css` file then re-skins the RBC class
 * names to consume the CSS variables in `app/calendar/themes/*.css`.
 * Importing the compiled CSS here keeps the override layer co-located
 * with the component that owns the class names.
 */
"use client";

import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { useMemo } from "react";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/app/calendar/rbc-overrides.css";

const locales = { "en-US": enUS };

/**
 * Our calendar-event shape. Mirrors the `time_blocks` row but leaves
 * room for future external (Google) events to share the same surface.
 *
 * `id` is the only field a parent must echo back through callbacks —
 * everything else is presentation metadata.
 */
export type LifeOSCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Optional resource key — drives Calendar Sets (ADR-013). */
  resourceId?: string;
  /** Distinguishes time-blocked *tasks* from external events for theming. */
  kind?: "time-block" | "event";
};

export type LifeOSCalendarCallbacks = {
  onSelectEvent?: (event: LifeOSCalendarEvent) => void;
  onSelectSlot?: (slot: { start: Date; end: Date }) => void;
  /**
   * Placeholder for the @dnd-kit overlay. We do NOT bind RBC's HTML5-DnD
   * addon. The parent route captures drag intent and calls back here.
   */
  onEventDrop?: (args: {
    event: LifeOSCalendarEvent;
    start: Date;
    end: Date;
  }) => void;
};

export type LifeOSCalendarProps = LifeOSCalendarCallbacks & {
  events: LifeOSCalendarEvent[];
  /**
   * Active theme. Must be one of the three enum values defined in
   * ADR-017. Defaults to "linear" to match the v0.2.0-alpha scope.
   */
  theme?: "linear" | "notion" | "apple";
  /** Default view on first paint. SPEC: week + day only in beta. */
  defaultView?: View;
  /** Minimum height for the grid (RBC requires an explicit height). */
  height?: number | string;
};

/**
 * `useLifeOSLocalizer` is exported separately so tests can pin a single
 * localizer instance without rendering the full Calendar. The localizer
 * is intentionally memoized on the function reference so re-renders
 * don't churn RBC's internal prop diffing.
 */
export function useLifeOSLocalizer() {
  return useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales,
      }),
    [],
  );
}

export function LifeOSCalendar({
  events,
  theme = "linear",
  defaultView = "week",
  height = 720,
  onSelectEvent,
  onSelectSlot,
}: LifeOSCalendarProps) {
  const localizer = useLifeOSLocalizer();

  return (
    <div className={`theme-${theme} h-full`} data-testid="lifeos-calendar">
      <Calendar<LifeOSCalendarEvent>
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        views={["week", "day", "agenda"]}
        style={{ height }}
        // a11y hooks: RBC has no built-in keyboard DnD. We expose
        // selection callbacks that route into the @dnd-kit overlay.
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        // resourceKey surfaces Calendar Sets (ADR-013). Optional on
        // events — empty array is fine for now.
      />
    </div>
  );
}
