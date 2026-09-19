/**
 * Application error hierarchy.
 *
 * Every thrown error in a route handler is either an `AppError` subclass
 * (typed, mapped to a known HTTP status) or an unknown value (treated as a
 * 500 by `errorToResponse`). The pattern mirrors C# `Exception` + custom
 * subclasses: one base, several narrow subclasses, each carrying the HTTP
 * status code and stable error code string.
 *
 * Status codes per RFC 9110 (the IANA-registered list at
 * https://en.wikipedia.org/wiki/List_of_HTTP_status_codes). Two important
 * distinctions this hierarchy enforces:
 *
 *   400 Invalid Parameter  — caller sent a malformed body. The form should
 *                            never let this happen; the server only fires
 *                            it when a non-form caller (curl, replay, bad
 *                            client) sends garbage.
 *   422 Unprocessable      — body parsed fine, but a business rule failed
 *                            (e.g. endTime <= startTime). The form should
 *                            check this before submit; if it lets it
 *                            through, the server returns 422.
 *
 *   401 Unauthorized       — no session / bad session.
 *   403 Forbidden          — session is valid but caller can't access
 *                            this row (RLS denies, role check fails).
 *
 * Per ADR-009. Replaces the prior `throw new Response(...)` pattern.
 */

import { fail } from "./api";

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

// ============================================
// 4xx client errors
// ============================================

export class AuthError extends AppError {
  readonly status = 401;
  readonly code = "unauthorized";
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "forbidden";
}

/**
 * Caller sent a malformed body. The form should prevent this; the server
 * fires it only when a non-form caller (curl, replay, bad client) sends
 * something the schema can't parse. Carries `details` (typically the zod
 * flatten output) so the client can show field-level errors when it does
 * receive one.
 */
export class InvalidParameterError extends AppError {
  readonly status = 400;
  readonly code = "invalid_parameter";
  constructor(
    message: string,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * Body parsed fine but violates a business rule. The form should check
 * these before submit (e.g. endTime > startTime); if it lets it through,
 * the server returns 422.
 */
export class UnprocessableError extends AppError {
  readonly status = 422;
  readonly code = "unprocessable";
  constructor(
    message: string,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export class PayloadTooLargeError extends AppError {
  readonly status = 413;
  readonly code = "payload_too_large";
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = "rate_limited";
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "conflict";
}

export class MethodNotAllowedError extends AppError {
  readonly status = 405;
  readonly code = "method_not_allowed";
}

// ============================================
// 5xx server errors
// ============================================

export class InternalError extends AppError {
  readonly status = 500;
  readonly code = "server_error";
}

export class NotImplementedError extends AppError {
  readonly status = 501;
  readonly code = "not_implemented";
}

export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = "service_unavailable";
}

// ============================================
// Mapper
// ============================================

/**
 * Map any thrown value to a typed JSON `Response`.
 *
 * - `AppError` subclass → its `status` + `code` + `message` (+ `details`
 *   for `InvalidParameterError` and `UnprocessableError`).
 * - `Response` → returned as-is (back-compat for `requireUserId()` while the
 *   migration is in flight; will be removed once all callers throw `AppError`).
 * - Anything else → `InternalError`, message extracted from `Error.message`
 *   when available.
 */
export function errorToResponse(err: unknown): Response {
  if (err instanceof AppError) {
    if (
      err instanceof InvalidParameterError ||
      err instanceof UnprocessableError
    ) {
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
