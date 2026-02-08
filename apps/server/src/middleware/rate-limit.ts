// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import type { MiddlewareHandler } from "hono"
import { getServerEnv } from "@nyoworks/shared"
import { TIMEOUTS, RATE_LIMITS } from "@nyoworks/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Store (Fallback)
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryStore = new Map<string, RateLimitEntry>()

async function checkInMemoryRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const now = Date.now()
  let entry = inMemoryStore.get(key)

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs }
    inMemoryStore.set(key, entry)
  } else {
    entry.count++
  }

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis Store
// ─────────────────────────────────────────────────────────────────────────────

let redisClient: import("ioredis").Redis | null = null
let redisInitialized = false

async function getRedisClient(): Promise<import("ioredis").Redis | null> {
  if (redisInitialized) return redisClient

  try {
    const env = getServerEnv()
    if (!env.REDIS_URL) {
      redisInitialized = true
      return null
    }

    const Redis = (await import("ioredis")).default
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    })

    await redisClient.ping()
    redisInitialized = true
    return redisClient
  } catch {
    redisInitialized = true
    redisClient = null
    return null
  }
}

async function checkRedisRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const client = await getRedisClient()

  if (!client) {
    return checkInMemoryRateLimit(key, windowMs, maxRequests)
  }

  try {
    const now = Date.now()
    const windowStart = now - windowMs
    const redisKey = `rate_limit:${key}`

    const pipeline = client.pipeline()
    pipeline.zremrangebyscore(redisKey, 0, windowStart)
    pipeline.zadd(redisKey, now.toString(), `${now}-${Math.random()}`)
    pipeline.zcard(redisKey)
    pipeline.pexpire(redisKey, windowMs)

    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) ?? 0

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: now + windowMs,
    }
  } catch {
    return checkInMemoryRateLimit(key, windowMs, maxRequests)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}): MiddlewareHandler {
  const windowMs = options.windowMs ?? TIMEOUTS.RATE_LIMIT_WINDOW
  const maxRequests = options.maxRequests ?? RATE_LIMITS.API.requests

  const getKey = options.keyGenerator ?? ((c) => {
    return c.req.header("X-Forwarded-For")?.split(",")[0] ?? "unknown"
  })

  return async (c, next) => {
    const key = getKey(c)
    const result = await checkRedisRateLimit(key, windowMs, maxRequests)

    c.header("X-RateLimit-Limit", maxRequests.toString())
    c.header("X-RateLimit-Remaining", result.remaining.toString())
    c.header("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString())

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      c.header("Retry-After", retryAfter.toString())
      return c.json(
        { error: "Too many requests", retryAfter },
        429
      )
    }

    return next()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Middleware (for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export const rateLimitMiddleware: MiddlewareHandler = createRateLimitMiddleware()

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Rate Limiters
// ─────────────────────────────────────────────────────────────────────────────

export const authRateLimitMiddleware: MiddlewareHandler = createRateLimitMiddleware({
  windowMs: RATE_LIMITS.AUTH.window * 1000,
  maxRequests: RATE_LIMITS.AUTH.requests,
})

export const apiRateLimitMiddleware: MiddlewareHandler = createRateLimitMiddleware({
  windowMs: RATE_LIMITS.API.window * 1000,
  maxRequests: RATE_LIMITS.API.requests,
})
