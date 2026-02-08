// ═══════════════════════════════════════════════════════════════════════════════
// Audit Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm"
import { auditLogs, type AuditLog, type NewAuditLog } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditListOptions {
  limit: number
  offset: number
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
  sortBy?: "createdAt" | "action" | "entityType"
  sortOrder?: "asc" | "desc"
}

export interface AuditListResult {
  items: AuditLog[]
  total: number
  hasMore: boolean
}

interface ActionCount {
  action: string
  count: number
}

interface EntityTypeCount {
  entityType: string
  count: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class AuditRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAuditLog, "id" | "createdAt" | "tenantId">): Promise<AuditLog> {
    const [result] = await this.db
      .insert(auditLogs)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<AuditLog | null> {
    const result = await this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.id, id), eq(auditLogs.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: AuditListOptions): Promise<AuditListResult> {
    const { limit, offset, sortBy = "createdAt", sortOrder = "desc" } = options

    const conditions = [eq(auditLogs.tenantId, this.tenantId)]

    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId))
    }

    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action))
    }

    if (options.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType))
    }

    if (options.entityId) {
      conditions.push(eq(auditLogs.entityId, options.entityId))
    }

    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate))
    }

    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate))
    }

    const sortColumns = {
      createdAt: auditLogs.createdAt,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
    } as const
    const orderFn = sortOrder === "asc" ? asc : desc
    const sortColumn = sortColumns[sortBy] ?? auditLogs.createdAt

    const items = await this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions))

    const total = Number(countResult[0]?.count ?? 0)

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async findByEntity(entityType: string, entityId: string, options?: { limit?: number; offset?: number }): Promise<AuditLog[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, this.tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findByUser(userId: string, options?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    const conditions = [
      eq(auditLogs.tenantId, this.tenantId),
      eq(auditLogs.userId, userId),
    ]

    if (options?.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate))
    }

    if (options?.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate))
    }

    return this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async countByAction(): Promise<ActionCount[]> {
    const result = await this.db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, this.tenantId))
      .groupBy(auditLogs.action)

    return result.map(r => ({ action: r.action, count: Number(r.count) }))
  }

  async countByEntityType(): Promise<EntityTypeCount[]> {
    const result = await this.db
      .select({
        entityType: auditLogs.entityType,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, this.tenantId))
      .groupBy(auditLogs.entityType)

    return result.map(r => ({ entityType: r.entityType, count: Number(r.count) }))
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, this.tenantId))

    return Number(result[0]?.count ?? 0)
  }
}
