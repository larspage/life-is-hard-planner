/**
 * Single source of truth for the Eisenhower quadrant enum values and their
 * UI labels.
 *
 * Enum values (`DO_FIRST`, `SCHEDULE`, `DELEGATE`, `Q4`) are the canonical
 * DB identifiers — they're stored in `tasks.quadrant` and appear in API
 * responses, query filters, and code. The display labels are what users see
 * in dropdowns and badges. The descriptor is the parenthetical Eisenhower
 * definition (used in help pop-ups and the tasks page intro card).
 *
 * `Q4` is the enum value (not the word "DELETE") because `DELETE` is a
 * Postgres reserved word and would force every query to quote-escape the
 * literal (`WHERE quadrant = '"DELETE"'`). The display label "Low Priority"
 * is a softer framing than "Delete" or "Neither".
 *
 * See docs/V0.3.0-BETA-DESIGN.md §5.1 for the rename history.
 */
export const QUADRANT_VALUES = [
  "DO_FIRST",
  "SCHEDULE",
  "DELEGATE",
  "Q4",
] as const;

export type Quadrant = (typeof QUADRANT_VALUES)[number];

export type QuadrantInfo = {
  readonly value: Quadrant;
  /** UI dropdown label */
  readonly label: string;
  /** Eisenhower parenthetical descriptor */
  readonly descriptor: string;
};

export const QUADRANTS: readonly QuadrantInfo[] = [
  {
    value: "DO_FIRST",
    label: "Do First",
    descriptor: "Urgent and Important",
  },
  {
    value: "SCHEDULE",
    label: "Schedule",
    descriptor: "Important, Not Urgent",
  },
  {
    value: "DELEGATE",
    label: "Delegate",
    descriptor: "Urgent, Not Important",
  },
  {
    value: "Q4",
    label: "Low Priority",
    descriptor: "Not Urgent, Not Important",
  },
] as const;

const LABEL_MAP = Object.freeze(
  QUADRANTS.reduce(
    (acc, q) => ({ ...acc, [q.value]: q.label }),
    {} as Record<Quadrant, string>,
  ),
);

const DESCRIPTOR_MAP = Object.freeze(
  QUADRANTS.reduce(
    (acc, q) => ({ ...acc, [q.value]: q.descriptor }),
    {} as Record<Quadrant, string>,
  ),
);

export const QUADRANT_LABEL: Readonly<Record<Quadrant, string>> = LABEL_MAP;
export const QUADRANT_DESCRIPTOR: Readonly<Record<Quadrant, string>> =
  DESCRIPTOR_MAP;

/** True if the input is a valid Quadrant enum value. */
export function isQuadrant(value: unknown): value is Quadrant {
  return (
    typeof value === "string" &&
    (QUADRANT_VALUES as readonly string[]).includes(value)
  );
}
