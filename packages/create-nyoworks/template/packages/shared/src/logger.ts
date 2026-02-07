// ═══════════════════════════════════════════════════════════════════════════════
// Structured Logger
// ═══════════════════════════════════════════════════════════════════════════════

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger Class
// ─────────────────────────────────────────────────────────────────────────────

class Logger {
  private context: Record<string, unknown> = {}

  child(context: Record<string, unknown>): Logger {
    const child = new Logger()
    child.context = { ...this.context, ...context }
    return child
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
    }

    const output = JSON.stringify(entry)

    switch (level) {
      case "debug":
        console.debug(output)
        break
      case "info":
        console.info(output)
        break
      case "warn":
        console.warn(output)
        break
      case "error":
        console.error(output)
        break
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("error", message, context)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export const logger = new Logger()
export { Logger }
