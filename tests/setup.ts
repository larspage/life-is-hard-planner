import "@testing-library/jest-dom/vitest";

// Per-test setup for vitest. Currently:
//   - Pulls in @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
//     for any component tests that get added later.
//
// Server-only test mocks (NextAuth session, Drizzle queries) belong in
// individual test files using `vi.mock('@/lib/auth', ...)`. The lazy
// Drizzle proxy in db/index.ts is fully mockable that way.
