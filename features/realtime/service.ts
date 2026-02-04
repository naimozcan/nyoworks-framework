// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Service
// ═══════════════════════════════════════════════════════════════════════════════

import { redis, publish } from "../../core/cache"
import { createLogger } from "../../core/shared/logger"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger("realtime-service")

const CHANNEL_PREFIX = process.env.REALTIME_CHANNEL_PREFIX || "rt"

// ─────────────────────────────────────────────────────────────────────────────
// Channel Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTenantChannel(tenantId: string): string {
  return `${CHANNEL_PREFIX}:tenant:${tenantId}`
}

function getUserChannel(tenantId: string, userId: string): string {
  return `${CHANNEL_PREFIX}:tenant:${tenantId}:user:${userId}`
}

function getEntityChannel(tenantId: string, entity: string, entityId: string): string {
  return `${CHANNEL_PREFIX}:tenant:${tenantId}:${entity}:${entityId}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast
// ─────────────────────────────────────────────────────────────────────────────

interface RealtimeMessage {
  type: string
  payload: unknown
  timestamp: number
}

async function broadcastToTenant(
  tenantId: string,
  type: string,
  payload: unknown
): Promise<boolean> {
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: Date.now(),
  }

  const success = await publish(getTenantChannel(tenantId), message)
  logger.debug({ tenantId, type }, "Broadcast to tenant")
  return success
}

async function broadcastToUser(
  tenantId: string,
  userId: string,
  type: string,
  payload: unknown
): Promise<boolean> {
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: Date.now(),
  }

  const success = await publish(getUserChannel(tenantId, userId), message)
  logger.debug({ tenantId, userId, type }, "Broadcast to user")
  return success
}

async function broadcastToEntity(
  tenantId: string,
  entity: string,
  entityId: string,
  type: string,
  payload: unknown
): Promise<boolean> {
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: Date.now(),
  }

  const success = await publish(getEntityChannel(tenantId, entity, entityId), message)
  logger.debug({ tenantId, entity, entityId, type }, "Broadcast to entity")
  return success
}

// ─────────────────────────────────────────────────────────────────────────────
// Presence
// ─────────────────────────────────────────────────────────────────────────────

const PRESENCE_TTL = 60

async function setPresence(
  tenantId: string,
  userId: string,
  status: "online" | "away" | "offline"
): Promise<void> {
  if (!redis) return

  const key = `${CHANNEL_PREFIX}:presence:${tenantId}:${userId}`
  await redis.setex(key, PRESENCE_TTL, JSON.stringify({ status, timestamp: Date.now() }))

  await broadcastToTenant(tenantId, "presence:update", { userId, status })
}

async function getPresence(
  tenantId: string,
  userId: string
): Promise<{ status: string; timestamp: number } | null> {
  if (!redis) return null

  const key = `${CHANNEL_PREFIX}:presence:${tenantId}:${userId}`
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

async function getOnlineUsers(tenantId: string): Promise<string[]> {
  if (!redis) return []

  const pattern = `${CHANNEL_PREFIX}:presence:${tenantId}:*`
  const keys = await redis.keys(pattern)
  return keys.map((key) => key.split(":").pop()!)
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const realtimeService = {
  getTenantChannel,
  getUserChannel,
  getEntityChannel,
  broadcastToTenant,
  broadcastToUser,
  broadcastToEntity,
  setPresence,
  getPresence,
  getOnlineUsers,
}
