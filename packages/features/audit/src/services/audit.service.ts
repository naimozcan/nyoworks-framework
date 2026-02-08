// ═══════════════════════════════════════════════════════════════════════════════
// Audit Service
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import { AuditRepository } from "../repositories/index.js"
import type { AuditLog } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LogInput {
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

interface ListInput {
  limit: number
  offset: number
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
  sortBy?: "createdAt" | "action" | "entityType"
  sortOrder?: "asc" | "desc"
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class AuditService {
  private readonly repository: AuditRepository

  constructor(db: unknown, tenantId: string) {
    this.repository = new AuditRepository(db, tenantId)
  }

  async log(input: LogInput): Promise<AuditLog> {
    return this.repository.create(input)
  }

  async list(input: ListInput) {
    return this.repository.list({
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    })
  }

  async get(auditLogId: string): Promise<AuditLog> {
    const log = await this.repository.findById(auditLogId)

    if (!log) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Audit log not found" })
    }

    return log
  }

  async getEntityHistory(entityType: string, entityId: string, options?: { limit?: number; offset?: number }) {
    const items = await this.repository.findByEntity(entityType, entityId, options)
    return { items }
  }

  async getUserActivity(userId: string, options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) {
    const items = await this.repository.findByUser(userId, {
      ...options,
      startDate: options?.startDate ? new Date(options.startDate) : undefined,
      endDate: options?.endDate ? new Date(options.endDate) : undefined,
    })
    return { items }
  }

  async getStats() {
    const [total, byAction, byEntityType] = await Promise.all([
      this.repository.count(),
      this.repository.countByAction(),
      this.repository.countByEntityType(),
    ])

    return {
      total,
      byAction: Object.fromEntries(byAction.map((row) => [row.action, row.count])),
      byEntityType: Object.fromEntries(byEntityType.map((row) => [row.entityType, row.count])),
    }
  }
}
