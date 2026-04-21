// Time unit conversion constants
// All task durations stored internally as minutes

export const TIME_UNITS_TO_MINUTES = {
  minutes: 1,
  hours: 60,
  days: 1440,      // 24 × 60 × 60
  weeks: 10080,    // 7 × days
  months: 2592000  // 30 × days (approximate)
} as const

export type TimeUnit = keyof typeof TIME_UNITS_TO_MINUTES

/**
 * Convert user input (value + unit) to minutes for internal storage
 */
export function toMinutes(value: number, unit: TimeUnit): number {
  return value * TIME_UNITS_TO_MINUTES[unit]
}

/**
 * Convert minutes to display-friendly string
 */
export function fromMinutes(totalMinutes: number): { value: number; unit: TimeUnit } {
  if (totalMinutes >= 2592000) {
    return { value: Math.round(totalMinutes / 2592000), unit: 'months' }
  }
  if (totalMinutes >= 10080) {
    return { value: Math.round(totalMinutes / 10080), unit: 'weeks' }
  }
  if (totalMinutes >= 1440) {
    return { value: Math.round(totalMinutes / 1440), unit: 'days' }
  }
  if (totalMinutes >= 60) {
    return { value: Math.round(totalMinutes / 60), unit: 'hours' }
  }
  return { value: totalMinutes, unit: 'minutes' }
}

/**
 * Determine task size category based on user's configured time scale
 */
export type TaskSizeCategory = 'boulder' | 'rock' | 'pebble' | 'sand'

export function getTaskSizeCategory(
  durationMinutes: number,
  userTimeScale: Record<TaskSizeCategory, { value: number; unit: string }>
): TaskSizeCategory {
  const sandMinutes = toMinutes(userTimeScale.sand.value, userTimeScale.sand.unit as TimeUnit)
  const pebbleMinutes = toMinutes(userTimeScale.pebble.value, userTimeScale.pebble.unit as TimeUnit)
  const rockMinutes = toMinutes(userTimeScale.rock.value, userTimeScale.rock.unit as TimeUnit)

  if (durationMinutes >= rockMinutes) return 'boulder'
  if (durationMinutes >= pebbleMinutes) return 'rock'
  if (durationMinutes >= sandMinutes) return 'pebble'
  return 'sand'
}