import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_MR_BROOKS_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_GIT_SHA,
  // Surface unhandled-promise rejections in the browser console AND ship
  // them to the portal so 3am failures show up there, not just locally.
  beforeSend(event) {
    if (event.environment === "development") {
      console.warn("[sentry/dev]", event.message, event.exception);
    }
    return event;
  },
});
