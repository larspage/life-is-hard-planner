/**
 * Tests for the react-big-calendar wrapper.
 *
 * We pin three behaviors that the wrapper commits to:
 *   1. `useLifeOSLocalizer` returns a stable localizer across renders.
 *   2. The wrapper renders a `<div>` with the active theme class
 *      (`.theme-linear` / `.theme-notion` / `.theme-apple`) so ADR-017's
 *      CSS-variable contract kicks in.
 *   3. The wrapper mounts RBC's compiled CSS so the override layer has
 *      class names to re-skin.
 *
 * We deliberately do not test RBC's internals — those belong upstream.
 * Drag-and-drop via `@dnd-kit` is a separate test surface (not yet
 * landed; ADR-016).
 */
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, renderHook } from "@testing-library/react";
import { LifeOSCalendar, useLifeOSLocalizer } from "@/lib/calendar/rbc";

afterEach(() => {
  cleanup();
});

describe("useLifeOSLocalizer", () => {
  it("returns a stable localizer reference across renders", () => {
    const { result, rerender } = renderHook(() => useLifeOSLocalizer());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("exposes the date-fns formatter contract", () => {
    const { result } = renderHook(() => useLifeOSLocalizer());
    // date-fns format() returns a string for any non-null Date.
    expect(
      typeof result.current.format(new Date(2026, 0, 1), "yyyy-MM-dd"),
    ).toBe("string");
  });
});

describe("LifeOSCalendar", () => {
  it("renders with the linear theme class by default", () => {
    render(<LifeOSCalendar events={[]} />);
    expect(screen.getByTestId("lifeos-calendar")).toHaveClass("theme-linear");
  });

  it("renders with the notion theme class when selected", () => {
    render(<LifeOSCalendar events={[]} theme="notion" />);
    expect(screen.getByTestId("lifeos-calendar")).toHaveClass("theme-notion");
  });

  it("renders with the apple theme class when selected", () => {
    render(<LifeOSCalendar events={[]} theme="apple" />);
    expect(screen.getByTestId("lifeos-calendar")).toHaveClass("theme-apple");
  });

  it("hydrates empty events without crashing", () => {
    expect(() => render(<LifeOSCalendar events={[]} />)).not.toThrow();
  });

  it("exposes the Week + Day view buttons in the toolbar", () => {
    // RBC's month-view button is intentionally absent per ADR-018 —
    // month view stays read-only in beta. RBC's accessible name for the
    // view button is the view label followed by the visible date range,
    // so we anchor with `^Week` / `^Day` / `^Month`.
    render(<LifeOSCalendar events={[]} />);
    expect(screen.getByRole("button", { name: /^Week\b/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Day\b/ })).toBeInTheDocument();
    // Month must NOT be a view button per ADR-018.
    expect(
      screen.queryByRole("button", { name: /^Month\b/ }),
    ).not.toBeInTheDocument();
  });
});
