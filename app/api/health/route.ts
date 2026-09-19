import { ok } from "@/lib/api";

/**
 * Liveness probe. No DB hit — Railway's healthcheck pings here every 30s
 * and `/api/health` returning 200 means the Next.js server is up.
 *
 * Returns the deployment commit SHA when available so the portal's probe
 * logs land with the same release tag as the server's events.
 */
export async function GET(): Promise<Response> {
  return ok({
    status: "ok",
    timestamp: new Date().toISOString(),
    release: process.env.NEXT_PUBLIC_GIT_SHA ?? null,
  });
}
