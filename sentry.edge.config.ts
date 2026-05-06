// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ff4dcfc3c0498243bc2aa355c6c08be5@o4511291633762304.ingest.us.sentry.io/4511291645362176",

  // DESATIVA O SENTRY LOCALMENTE (EDGE RUNTIME)
  enabled: process.env.NODE_ENV !== 'development',

  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  sendDefaultPii: true,
});