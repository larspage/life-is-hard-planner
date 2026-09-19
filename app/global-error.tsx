"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root error boundary. Catches uncaught render errors at the route level,
 * reports them to the portal via Sentry SDK, and renders a recovery UI.
 *
 * Required for portal integration QA gate (development-standards Section A
 * + Section E): a deliberate error from a non-dev env must reach the portal
 * within 30 seconds. Without this file, render errors fail silently.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1>Something went wrong</h1>
        <p style={{ color: "#6b6b6b", maxWidth: "480px", textAlign: "center" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "16px",
            padding: "10px 18px",
            border: "1px solid #e5e3dd",
            borderRadius: "10px",
            background: "transparent",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
