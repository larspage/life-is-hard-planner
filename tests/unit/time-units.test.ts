import { describe, expect, it } from "vitest";
import {
  TIME_UNITS_TO_MINUTES,
  fromMinutes,
  getTaskSizeCategory,
  toMinutes,
  type UserTimeScale,
} from "@/lib/time-units";

describe("toMinutes", () => {
  it("converts each unit correctly", () => {
    expect(toMinutes(1, "minutes")).toBe(1);
    expect(toMinutes(1, "hours")).toBe(60);
    expect(toMinutes(1, "days")).toBe(1440);
    expect(toMinutes(1, "weeks")).toBe(10080);
    expect(toMinutes(1, "months")).toBe(2592000);
  });

  it("throws on unknown unit", () => {
    // @ts-expect-error — testing runtime guard against bad input
    expect(() => toMinutes(1, "fortnight")).toThrow(/Unknown time unit/);
  });
});

describe("fromMinutes", () => {
  it("returns minutes under an hour", () => {
    expect(fromMinutes(45)).toEqual({ value: 45, unit: "minutes" });
  });

  it("returns hours under a day", () => {
    expect(fromMinutes(120)).toEqual({ value: 2, unit: "hours" });
  });

  it("returns days under a week", () => {
    expect(fromMinutes(1440 * 3)).toEqual({ value: 3, unit: "days" });
  });

  it("returns weeks under a month", () => {
    expect(fromMinutes(10080 * 2)).toEqual({ value: 2, unit: "weeks" });
  });

  it("returns months when large enough", () => {
    expect(fromMinutes(2592000 * 4)).toEqual({ value: 4, unit: "months" });
  });
});

describe("getTaskSizeCategory", () => {
  const scale: UserTimeScale = {
    boulder: { value: 4, unit: "hours" },
    rock: { value: 1, unit: "hours" },
    pebble: { value: 15, unit: "minutes" },
    sand: { value: 5, unit: "minutes" },
  };

  it("returns sand for short tasks", () => {
    expect(getTaskSizeCategory(2, scale)).toBe("sand");
  });

  it("returns pebble when between sand and rock", () => {
    expect(getTaskSizeCategory(30, scale)).toBe("pebble");
  });

  it("returns rock when between pebble and boulder", () => {
    expect(getTaskSizeCategory(90, scale)).toBe("rock");
  });

  it("returns boulder when duration ≥ rock minutes", () => {
    expect(getTaskSizeCategory(240, scale)).toBe("boulder");
  });
});

describe("TIME_UNITS_TO_MINUTES", () => {
  it("keeps the canonical conversion table", () => {
    expect(TIME_UNITS_TO_MINUTES).toEqual({
      minutes: 1,
      hours: 60,
      days: 1440,
      weeks: 10080,
      months: 2592000,
    });
  });
});
