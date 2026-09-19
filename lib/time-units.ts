/**
 * LifeOS — time unit conversion helpers.
 *
 * All task durations are stored as minutes in the database. UI inputs collect
 * (value, unit) pairs and convert on submit. The four task size categories
 * (boulder / rock / pebble / sand) are computed against a per-user
 * time scale configured during onboarding.
 *
 * Migrated from `packages/shared/src/index.ts` in the prior yarn workspace
 * layout. The math is unchanged; this file is now the canonical home.
 */

export const TIME_UNITS_TO_MINUTES = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 2592000,
} as const;

export type TimeUnit = keyof typeof TIME_UNITS_TO_MINUTES;

export function toMinutes(value: number, unit: TimeUnit): number {
  const factor = TIME_UNITS_TO_MINUTES[unit];
  if (factor === undefined) {
    throw new Error(`Unknown time unit: ${unit}`);
  }
  return value * factor;
}

export function fromMinutes(totalMinutes: number): {
  value: number;
  unit: TimeUnit;
} {
  if (totalMinutes >= TIME_UNITS_TO_MINUTES.months) {
    return {
      value: Math.round(totalMinutes / TIME_UNITS_TO_MINUTES.months),
      unit: "months",
    };
  }
  if (totalMinutes >= TIME_UNITS_TO_MINUTES.weeks) {
    return {
      value: Math.round(totalMinutes / TIME_UNITS_TO_MINUTES.weeks),
      unit: "weeks",
    };
  }
  if (totalMinutes >= TIME_UNITS_TO_MINUTES.days) {
    return {
      value: Math.round(totalMinutes / TIME_UNITS_TO_MINUTES.days),
      unit: "days",
    };
  }
  if (totalMinutes >= TIME_UNITS_TO_MINUTES.hours) {
    return {
      value: Math.round(totalMinutes / TIME_UNITS_TO_MINUTES.hours),
      unit: "hours",
    };
  }
  return { value: totalMinutes, unit: "minutes" };
}

export type TaskSizeCategory = "boulder" | "rock" | "pebble" | "sand";

export type UserTimeScale = Record<
  TaskSizeCategory,
  { value: number; unit: string }
>;

export function getTaskSizeCategory(
  durationMinutes: number,
  userTimeScale: UserTimeScale,
): TaskSizeCategory {
  const rockMinutes = toMinutes(
    userTimeScale.rock.value,
    userTimeScale.rock.unit as TimeUnit,
  );
  const pebbleMinutes = toMinutes(
    userTimeScale.pebble.value,
    userTimeScale.pebble.unit as TimeUnit,
  );
  const sandMinutes = toMinutes(
    userTimeScale.sand.value,
    userTimeScale.sand.unit as TimeUnit,
  );

  if (durationMinutes >= rockMinutes) return "boulder";
  if (durationMinutes >= pebbleMinutes) return "rock";
  if (durationMinutes >= sandMinutes) return "pebble";
  return "sand";
}
