// Error and performance monitoring (Sentry). Bundled into /vendor/monitor.min.js by scripts/build.mjs and only
// added to the page when config/public.json has a sentry.dsn. Privacy: no IP or user, no console or typed text,
// no query strings (they can hold Stripe session IDs), and nothing from the shifts stored on the device.
import { init, browserTracingIntegration, captureException } from "@sentry/browser";

const cfg = (window.CLOCKME_CFG || {}).sentry || {};
const noQuery = (u) => (typeof u === "string" ? u.split(/[?#]/)[0] : u);

if (cfg.dsn) {
  const host = location.hostname;
  init({
    dsn: cfg.dsn,
    environment: (cfg.productionHosts || []).includes(host) ? "production" : host === "localhost" ? "development" : "preview",
    sendDefaultPii: false,
    tracesSampleRate: typeof cfg.tracesSampleRate === "number" ? cfg.tracesSampleRate : 0.1,
    integrations: [browserTracingIntegration()],
    tracePropagationTargets: [/^\/api\//],
    beforeBreadcrumb(b) {
      if (b.category === "console" || b.category === "ui.input") return null;
      if (b.data) for (const k of ["url", "from", "to"]) if (k in b.data) b.data[k] = noQuery(b.data[k]);
      return b;
    },
    beforeSend(event) {
      delete event.user;
      if (event.request) { event.request.url = noQuery(event.request.url); delete event.request.cookies; delete event.request.headers; delete event.request.query_string; }
      return event;
    },
  });
  window.ClockMeMonitor = { captureException };
}
