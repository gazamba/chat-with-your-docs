import pino from "pino";

/**
 * Structured JSON logger. Plain pino (no pretty transport) so it stays safe
 * inside the Next.js server bundle and is easy to ship to a log collector.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "chat-with-your-docs" },
});

export type Logger = typeof logger;

/** Create a child logger scoped to a single request. */
export function requestLogger(requestId: string, fields?: Record<string, unknown>) {
  return logger.child({ requestId, ...fields });
}
