/**
 * Standard JSON response shapes for route handlers.
 *
 * Every API route returns `Response.json(...)` with one of these shapes so
 * the client can parse error/success with a single type discriminator.
 */

export type ApiSuccess<T> = { data: T };
export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data } satisfies ApiSuccess<T>, init);
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, details } } satisfies ApiError,
    { status },
  );
}

export function unauthorized(): Response {
  return fail("unauthorized", "Sign in to perform this action", 401);
}

export function badRequest(details: unknown): Response {
  return fail("bad_request", "Request body did not validate", 400, details);
}

export function notFound(resource: string): Response {
  return fail("not_found", `${resource} not found`, 404);
}

export function serverError(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Internal error";
  return fail("server_error", message, 500);
}
