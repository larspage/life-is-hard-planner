export { default } from "next-auth/middleware";

// Routes that require auth. Everything else (API auth handler, /login,
// /api/health, /_next, static assets) is open.
export const config = {
  matcher: [
    "/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
