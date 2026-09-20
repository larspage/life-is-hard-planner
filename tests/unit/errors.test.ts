import { describe, expect, it } from "vitest";
import {
  AppError,
  AuthError,
  ConflictError,
  ForbiddenError,
  InternalError,
  InvalidParameterError,
  MethodNotAllowedError,
  NotFoundError,
  NotImplementedError,
  PayloadTooLargeError,
  RateLimitedError,
  ServiceUnavailableError,
  UnprocessableError,
  errorToResponse,
} from "@/lib/errors";

/**
 * Verifies the AppError → HTTP response mapping. Every subclass carries
 * its status code and a stable `code` string. The mapper must produce a
 * JSON body in the { error: { code, message, details? } } shape so
 * clients can branch on the code without parsing the message.
 */

describe("errorToResponse", () => {
  const cases: Array<{
    name: string;
    error: AppError;
    expectedStatus: number;
    expectedCode: string;
    expectsDetails?: boolean;
  }> = [
    {
      name: "AuthError",
      error: new AuthError("nope"),
      expectedStatus: 401,
      expectedCode: "unauthorized",
    },
    {
      name: "ForbiddenError",
      error: new ForbiddenError("nope"),
      expectedStatus: 403,
      expectedCode: "forbidden",
    },
    {
      name: "InvalidParameterError",
      error: new InvalidParameterError("bad body", { field: "x" }),
      expectedStatus: 400,
      expectedCode: "invalid_parameter",
      expectsDetails: true,
    },
    {
      name: "UnprocessableError",
      error: new UnprocessableError("bad rule", { field: "x" }),
      expectedStatus: 422,
      expectedCode: "unprocessable",
      expectsDetails: true,
    },
    {
      name: "PayloadTooLargeError",
      error: new PayloadTooLargeError("too big"),
      expectedStatus: 413,
      expectedCode: "payload_too_large",
    },
    {
      name: "RateLimitedError",
      error: new RateLimitedError("slow down"),
      expectedStatus: 429,
      expectedCode: "rate_limited",
    },
    {
      name: "NotFoundError",
      error: new NotFoundError("missing"),
      expectedStatus: 404,
      expectedCode: "not_found",
    },
    {
      name: "ConflictError",
      error: new ConflictError("dup"),
      expectedStatus: 409,
      expectedCode: "conflict",
    },
    {
      name: "MethodNotAllowedError",
      error: new MethodNotAllowedError("nope"),
      expectedStatus: 405,
      expectedCode: "method_not_allowed",
    },
    {
      name: "InternalError",
      error: new InternalError("boom"),
      expectedStatus: 500,
      expectedCode: "server_error",
    },
    {
      name: "NotImplementedError",
      error: new NotImplementedError("later"),
      expectedStatus: 501,
      expectedCode: "not_implemented",
    },
    {
      name: "ServiceUnavailableError",
      error: new ServiceUnavailableError("down"),
      expectedStatus: 503,
      expectedCode: "service_unavailable",
    },
  ];

  for (const c of cases) {
    it(`maps ${c.name} → ${c.expectedStatus} ${c.expectedCode}`, async () => {
      const res = errorToResponse(c.error);
      expect(res.status).toBe(c.expectedStatus);
      const body = (await res.json()) as {
        error: { code: string; message: string; details?: unknown };
      };
      expect(body.error.code).toBe(c.expectedCode);
      expect(body.error.message).toBe(c.error.message);
      if (c.expectsDetails) {
        expect(body.error.details).toBeDefined();
      }
    });
  }

  it("passes an existing Response through unchanged", async () => {
    const original = new Response("raw", { status: 418 });
    const mapped = errorToResponse(original);
    expect(mapped).toBe(original);
  });

  it("maps an unknown Error to 500 server_error with the Error.message", async () => {
    const mapped = errorToResponse(new Error("kaboom"));
    expect(mapped.status).toBe(500);
    const body = (await mapped.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("server_error");
    expect(body.error.message).toBe("kaboom");
  });

  it("maps a non-Error throw (e.g. a string) to 500 with a generic message", async () => {
    const mapped = errorToResponse("something");
    expect(mapped.status).toBe(500);
    const body = (await mapped.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("server_error");
    expect(body.error.message).toBe("Internal error");
  });

  it("InvalidParameterError carries details through the response", async () => {
    const details = { email: "invalid email", age: "must be a number" };
    const mapped = errorToResponse(
      new InvalidParameterError("Body failed validation", details),
    );
    const body = (await mapped.json()) as {
      error: { code: string; message: string; details: unknown };
    };
    expect(body.error.details).toEqual(details);
  });
});
