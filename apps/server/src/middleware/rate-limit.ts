// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import type { MiddlewareHandler } from "hono"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Store (Replace with Redis in production)
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>()

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 100

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("X-Forwarded-For")?.split(",")[0] ?? "unknown"
  const key = `rate-limit:${ip}`
  const now = Date.now()

  let entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + WINDOW_MS }
    store.set(key, entry)
  } else {
    entry.count++
  }

  c.header("X-RateLimit-Limit", MAX_REQUESTS.toString())
  c.header("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - entry.count).toString())
  c.header("X-RateLimit-Reset", entry.resetAt.toString())

  if (entry.count > MAX_REQUESTS) {
    return c.json(
      { error: "Too many requests", retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
      429
    )
  }

  return next()
}
