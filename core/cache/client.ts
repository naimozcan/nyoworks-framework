// ═══════════════════════════════════════════════════════════════════════════════
// Redis Client - Cache Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import Redis from "ioredis"
import { createLogger } from "../shared/logger"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || "3", 10)
const REDIS_RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY || "200", 10)

const logger = createLogger("cache")

// ─────────────────────────────────────────────────────────────────────────────
// Redis Instance
// ─────────────────────────────────────────────────────────────────────────────

function createRedisClient(): Redis | null {
  if (!REDIS_URL) {
    logger.warn("REDIS_URL not configured, cache disabled")
    return null
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: REDIS_MAX_RETRIES,
    retryStrategy: (times) => {
      if (times > REDIS_MAX_RETRIES) {
        logger.error({ times }, "Redis max retries exceeded")
        return null
      }
      return Math.min(times * REDIS_RETRY_DELAY, 2000)
    },
    lazyConnect: true,
  })

  client.on("connect", () => {
    logger.info("Redis connected")
  })

  client.on("error", (error) => {
    logger.error({ error: error.message }, "Redis error")
  })

  client.on("close", () => {
    logger.warn("Redis connection closed")
  })

  return client
}

export const redis = createRedisClient()

// ─────────────────────────────────────────────────────────────────────────────
// Connection Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function connectRedis(): Promise<boolean> {
  if (!redis) return false

  try {
    await redis.connect()
    return true
  } catch (error) {
    logger.error({ error }, "Failed to connect to Redis")
    return false
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return

  try {
    await redis.quit()
  } catch (error) {
    logger.error({ error }, "Error disconnecting from Redis")
  }
}

export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === "ready"
}
