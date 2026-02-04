// ═══════════════════════════════════════════════════════════════════════════════
// Audit Service
// ═══════════════════════════════════════════════════════════════════════════════

import { db, eq, and, desc } from "../../core/database/client"
import { auditLogs } from "./schema"
import { createLogger } from "../../core/shared/logger"
import type { AuditLog, NewAuditLog } from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger("audit-service")

// ─────────────────────────────────────────────────────────────────────────────
// Log Activity
// ─────────────────────────────────────────────────────────────────────────────

async function log(data: NewAuditLog): Promise<AuditLog> {
  const [entry] = await db
    .insert(auditLogs)
    .values(data)
    .returning()

  logger.debug({
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    userId: data.userId,
  }, "Audit log created")

  return entry
}

async function logAction(
  tenantId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  options?: {
    changes?: Record<string, unknown>
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<AuditLog> {
  return log({
    tenantId,
    userId,
    action,
    entity,
    entityId,
    changes: options?.changes,
    metadata: options?.metadata,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Logs
// ─────────────────────────────────────────────────────────────────────────────

interface QueryOptions {
  userId?: string
  entity?: string
  entityId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

async function query(tenantId: string, options: QueryOptions = {}): Promise<AuditLog[]> {
  const {
    userId,
    entity,
    entityId,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options

  let query = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  return query
}

async function getByEntity(
  tenantId: string,
  entity: string,
  entityId: string,
  limit: number = 20
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.entity, entity),
        eq(auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
}

async function getByUser(
  tenantId: string,
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.userId, userId)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff Helper
// ─────────────────────────────────────────────────────────────────────────────

function computeChanges<T extends Record<string, unknown>>(
  oldData: T,
  newData: T
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  for (const key of Object.keys(newData)) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      }
    }
  }

  return changes
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const auditService = {
  log,
  logAction,
  query,
  getByEntity,
  getByUser,
  computeChanges,
}
