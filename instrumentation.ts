/**
 * Next.js instrumentation hook. Runs once at server startup (and once for
 * each runtime on the edge). Loads the right Sentry config per runtime so
 * the @sentry/nextjs SDK patches `console`, error-boundaries, and unhandled
 * promise rejections before any app code runs.
 *
 * Portal integration contract: per docs/INTEGRATION.md §6 ("Set NEXT_PUBLIC_ENV")
 * and development-standards Section C, errors that reach here must reach the
 * portal. The SDK is initialized with the project DSN above; the verify step
 * (deliberate error from a non-dev env landing in the portal's `events` table
 * within 30 seconds) is the integration QA gate per Section A.
 *
 * Reference: MrBrooks Admin Portal `instrumentation.ts` (canonical pattern).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
