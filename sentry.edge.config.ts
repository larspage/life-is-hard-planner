import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_MR_BROOKS_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_GIT_SHA,
});
