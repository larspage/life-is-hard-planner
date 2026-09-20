import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Auth-bypass integration test per the I4 spec. For every protected
 * route, asserts that calling without a session returns 401 (for JSON
 * route handlers) or redirects to /login (for server components).
 *
 * Approach: mock `next-auth` so `auth()` returns null. The route
 * handler's `requireUserId()` will throw AuthError; `withErrorHandling`
 * catches it and `errorToResponse` maps it to a 401 JSON response.
 */

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  requireUserId: async () => {
    const session = await mockAuth();
    if (!session?.user?.id) {
      throw new (await import("@/lib/errors")).AuthError(
        "Sign in to perform this action",
      );
    }
    return session.user.id;
  },
}));

// The db proxy must not initialize a real connection during this test.
vi.mock("@/db", () => ({
  withUserContext: async <T>(_userId: string, fn: () => Promise<T>) => fn(),
  db: new Proxy({} as never, { get: () => () => Promise.resolve([]) }),
  closeDb: async () => {},
  schema: {},
}));

beforeEach(() => {
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(null);
});

const PROTECTED_ROUTES = [
  // Collection routes — GET and POST should both 401 without session
  { path: "app/api/roles/route.ts", methods: ["GET", "POST"] },
  { path: "app/api/values/route.ts", methods: ["GET", "POST"] },
  { path: "app/api/goals/route.ts", methods: ["GET", "POST"] },
  { path: "app/api/tasks/route.ts", methods: ["GET", "POST"] },
  { path: "app/api/time-blocks/route.ts", methods: ["GET", "POST"] },
  // Item routes — GET, PATCH, DELETE should all 401 without session
  { path: "app/api/roles/[id]/route.ts", methods: ["GET", "PATCH", "DELETE"] },
  { path: "app/api/values/[id]/route.ts", methods: ["GET", "PATCH", "DELETE"] },
  { path: "app/api/goals/[id]/route.ts", methods: ["GET", "PATCH", "DELETE"] },
  { path: "app/api/tasks/[id]/route.ts", methods: ["GET", "PATCH", "DELETE"] },
  {
    path: "app/api/time-blocks/[id]/route.ts",
    methods: ["GET", "PATCH", "DELETE"],
  },
] as const;

const FAKE_ID = "11111111-1111-1111-1111-111111111111";

describe("auth bypass — protected routes return 401 without session", () => {
  for (const { path, methods } of PROTECTED_ROUTES) {
    for (const method of methods) {
      it(`${path} ${method} → 401`, async () => {
        const mod = await import(`@/${path}`);
        const handler = mod[method];
        expect(handler).toBeDefined();

        const req = new Request(
          `http://localhost/${path.replace("[id]", FAKE_ID)}`,
          {
            method,
            headers: { "content-type": "application/json" },
            body: method === "GET" || method === "DELETE" ? undefined : "{}",
          },
        );
        const params = path.includes("[id]") ? { id: FAKE_ID } : undefined;
        const res = await handler(req, params ? { params } : undefined);

        expect(res.status).toBe(401);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe("unauthorized");
      });
    }
  }
});
