// ═══════════════════════════════════════════════════════════════════════════════
// Logger Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { logger } from "hono/logger"
import type { MiddlewareHandler } from "hono"

// ─────────────────────────────────────────────────────────────────────────────
// Request ID Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("X-Request-ID") ?? crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("X-Request-ID", requestId)
  await next()
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const loggerMiddleware = logger((str, ...rest) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${str}`, ...rest)
})
