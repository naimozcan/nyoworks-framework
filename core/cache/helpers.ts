// ═══════════════════════════════════════════════════════════════════════════════
// Cache Helpers - Common Operations
// ═══════════════════════════════════════════════════════════════════════════════

import { redis, isRedisAvailable } from "./client"
import { CacheTTL, type CacheTTLKey } from "./keys"
import { createLogger } from "../shared/logger"

const logger = createLogger("cache-helpers")

// ─────────────────────────────────────────────────────────────────────────────
// Basic Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable() || !redis) return null

  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    logger.error({ key, error }, "Cache get error")
    return null
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlKey?: CacheTTLKey,
  ttlOverride?: number
): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  try {
    const ttl = ttlOverride ?? (ttlKey ? CacheTTL[ttlKey] : undefined)
    const serialized = JSON.stringify(value)

    if (ttl) {
      await redis.setex(key, ttl, serialized)
    } else {
      await redis.set(key, serialized)
    }

    return true
  } catch (error) {
    logger.error({ key, error }, "Cache set error")
    return false
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  try {
    await redis.del(key)
    return true
  } catch (error) {
    logger.error({ key, error }, "Cache delete error")
    return false
  }
}

export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!isRedisAvailable() || !redis) return 0

  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) return 0

    const deleted = await redis.del(...keys)
    return deleted
  } catch (error) {
    logger.error({ pattern, error }, "Cache delete pattern error")
    return 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache-Aside Pattern
// ─────────────────────────────────────────────────────────────────────────────

export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T | null>,
  ttlKey?: CacheTTLKey,
  ttlOverride?: number
): Promise<T | null> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const fresh = await fetchFn()
  if (fresh !== null) {
    await cacheSet(key, fresh, ttlKey, ttlOverride)
  }

  return fresh
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  if (!isRedisAvailable() || !redis) return 0

  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    return count
  } catch (error) {
    logger.error({ key, error }, "Rate limit increment error")
    return 0
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!isRedisAvailable() || !redis) {
    return { allowed: true, remaining: limit, resetIn: 0 }
  }

  try {
    const count = await incrementRateLimit(key, windowSeconds)
    const ttl = await redis.ttl(key)

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    }
  } catch (error) {
    logger.error({ key, error }, "Check rate limit error")
    return { allowed: true, remaining: limit, resetIn: 0 }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Distributed Locks
// ─────────────────────────────────────────────────────────────────────────────

export async function acquireLock(
  key: string,
  ttlSeconds: number = 30
): Promise<string | null> {
  if (!isRedisAvailable() || !redis) return null

  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    const result = await redis.set(key, lockValue, "EX", ttlSeconds, "NX")
    return result === "OK" ? lockValue : null
  } catch (error) {
    logger.error({ key, error }, "Acquire lock error")
    return null
  }
}

export async function releaseLock(key: string, lockValue: string): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `

  try {
    const result = await redis.eval(luaScript, 1, key, lockValue)
    return result === 1
  } catch (error) {
    logger.error({ key, error }, "Release lock error")
    return false
  }
}

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: { ttlSeconds?: number; waitMs?: number; maxAttempts?: number } = {}
): Promise<T | null> {
  const { ttlSeconds = 30, waitMs = 100, maxAttempts = 10 } = options

  let attempts = 0
  let lockValue: string | null = null

  while (attempts < maxAttempts) {
    lockValue = await acquireLock(key, ttlSeconds)
    if (lockValue) break

    attempts++
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  if (!lockValue) {
    logger.warn({ key, attempts }, "Failed to acquire lock after max attempts")
    return null
  }

  try {
    return await fn()
  } finally {
    await releaseLock(key, lockValue)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pub/Sub Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function publish(channel: string, message: unknown): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  try {
    await redis.publish(channel, JSON.stringify(message))
    return true
  } catch (error) {
    logger.error({ channel, error }, "Publish error")
    return false
  }
}
