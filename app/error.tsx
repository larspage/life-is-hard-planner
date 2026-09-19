"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
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
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "24px",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Something broke</h1>
      <p style={{ color: "#6b6b6b", maxWidth: "480px", textAlign: "center" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button type="button" className="btn btn-secondary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
