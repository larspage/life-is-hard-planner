import type { Config } from "tailwindcss";

/**
 * Tailwind config. Light-mode only (ADR-006.b + ADR-006 superseded).
 * Design tokens land in app/globals.css under `:root` and are referenced
 * here as CSS variables so the theme survives the Volt design pass in
 * beta without rebuilding utility classes.
 *
 * The actual Volt brand (Linear, Notion, Stripe, etc.) is selected by
 * Pixel during the beta design pass per SPEC §Release strategy. The
 * alpha theme is intentionally minimal: warm-neutral surfaces, single
 * accent, serif/sans pairing for the warm-cozy feel the prior landing
 * page had.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      calendarGridBg: "var(--calendar-grid-bg)",
      calendarGridLine: "var(--calendar-grid-line)",
      calendarGridTodayBg: "var(--calendar-grid-today-bg)",
      calendarEventRadius: "var(--calendar-event-border-radius)",
      calendarEventPadding:
        "var(--calendar-event-padding-y) var(--calendar-event-padding-x)",
      calendarDaytickerHeight: "var(--calendar-dayticker-height)",
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
