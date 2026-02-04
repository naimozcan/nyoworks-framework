// ═══════════════════════════════════════════════════════════════════════════════
// Logger - Pino Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import pino from "pino"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const isDevelopment = process.env.NODE_ENV === "development"

const loggerOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger Instance
// ─────────────────────────────────────────────────────────────────────────────

export const logger = pino(loggerOptions)

// ─────────────────────────────────────────────────────────────────────────────
// Child Logger Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createLogger(name: string, context?: Record<string, unknown>) {
  return logger.child({ name, ...context })
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Logger
// ─────────────────────────────────────────────────────────────────────────────

export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
) {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"

  logger[level]({
    type: "request",
    method,
    path,
    statusCode,
    duration,
    ...context,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Logger
// ─────────────────────────────────────────────────────────────────────────────

export function logError(
  error: Error,
  context?: Record<string, unknown>
) {
  logger.error({
    type: "error",
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  })
}
