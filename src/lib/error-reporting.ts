type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

// Central place to send runtime/React errors somewhere durable (e.g. Sentry,
// a logging endpoint). Currently logs to the console; swap the body of
// reportError for a real error-tracking integration when you add one.
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ErrorReportOptions = {},
) {
  if (typeof window === "undefined") return;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[error-reporting]", message, {
    route: window.location.pathname,
    mechanism: options.mechanism ?? "manual",
    handled: options.handled ?? true,
    severity: options.severity ?? "error",
    ...context,
  });
}
