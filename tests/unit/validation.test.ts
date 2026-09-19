import { describe, expect, it } from "vitest";
import {
  goalSchema,
  roleSchema,
  taskSchema,
  timeBlockSchema,
  valueSchema,
} from "@/lib/validation";

describe("roleSchema", () => {
  it("accepts a minimal role", () => {
    const parsed = roleSchema.safeParse({ name: "Parent" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty name", () => {
    const parsed = roleSchema.safeParse({ name: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects bad color", () => {
    const parsed = roleSchema.safeParse({ name: "X", color: "red" });
    expect(parsed.success).toBe(false);
  });
});

describe("valueSchema", () => {
  it("defaults tags to empty array", () => {
    const parsed = valueSchema.safeParse({ text: "Be present" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toEqual([]);
    }
  });
});

describe("goalSchema", () => {
  it("requires horizon", () => {
    const parsed = goalSchema.safeParse({ title: "Run a marathon" });
    expect(parsed.success).toBe(false);
  });

  it("coerces targetDate strings", () => {
    const parsed = goalSchema.safeParse({
      title: "X",
      horizon: "LONG_TERM",
      targetDate: "2027-01-01",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetDate).toBeInstanceOf(Date);
    }
  });
});

describe("taskSchema", () => {
  it("rejects duration over 24 hours", () => {
    const parsed = taskSchema.safeParse({
      title: "Write a novel",
      duration: 2000,
      quadrant: "II",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid Big Rock task", () => {
    const parsed = taskSchema.safeParse({
      title: "Deep work block",
      duration: 90,
      quadrant: "II",
      priorityType: "BIG_ROCK",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("timeBlockSchema", () => {
  it("rejects endTime <= startTime", () => {
    const parsed = timeBlockSchema.safeParse({
      taskId: "11111111-1111-1111-1111-111111111111",
      startTime: "2026-09-16T10:00:00Z",
      endTime: "2026-09-16T09:00:00Z",
      date: "2026-09-16",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a forward interval", () => {
    const parsed = timeBlockSchema.safeParse({
      taskId: "11111111-1111-1111-1111-111111111111",
      startTime: "2026-09-16T10:00:00Z",
      endTime: "2026-09-16T11:00:00Z",
      date: "2026-09-16",
    });
    expect(parsed.success).toBe(true);
  });
});
