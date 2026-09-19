/**
 * Application error hierarchy.
 *
 * Every thrown error in a route handler is either an `AppError` subclass
 * (typed, mapped to a known HTTP status) or an unknown value (treated as a
 * 500 by `errorToResponse`). The pattern mirrors C# `Exception` + custom
 * subclasses: one base, several narrow subclasses, each carrying the HTTP
 * status code and stable error code string.
 *
 * Per ADR-009. Replaces the prior `throw new Response(...)` pattern.
 */

import { ok, fail } from "./api";

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthError extends AppError {
  readonly status = 401;
  readonly code = "unauthorized";
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "bad_request";
  constructor(
    message: string,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "conflict";
}

export class InternalError extends AppError {
  readonly status = 500;
  readonly code = "server_error";
}

/**
 * Map any thrown value to a typed JSON `Response`.
 *
 * - `AppError` subclass → its `status` + `code` + `message` (+ `details` for
 *   `ValidationError`).
 * - `Response` → returned as-is (back-compat for `requireUserId()` while the
 *   migration is in flight; will be removed once all callers throw `AppError`).
 * - Anything else → `InternalError`, message extracted from `Error.message`
 *   when available.
 */
export function errorToResponse(err: unknown): Response {
  if (err instanceof AppError) {
    if (err instanceof ValidationError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    return fail(err.code, err.message, err.status);
  }

  if (err instanceof Response) {
    return err;
  }

  const message = err instanceof Error ? err.message : "Internal error";
  return fail("server_error", message, 500);
}

/**
 * Wrap an async route handler. Catches thrown errors and maps them to a
 * typed response via `errorToResponse`. The handler's return value is
 * passed through unchanged when it's already a `Response`; otherwise it's
 * wrapped in `ok(...)`.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => {
 *     const userId = await requireUserId();
 *     const rows = await db.select()...;
 *     return ok(rows);
 *   });
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      return errorToResponse(err);
    }
  };
}
