// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - Auto-Logging Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { auditLogs, type NewAuditLog } from "./schema.js"
import type { AuditAction } from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuditContext {
  tenantId: string
  userId?: string
  ipAddress?: string
  userAgent?: string
}

interface AuditableChange {
  entityType: string
  entityId: string
  action: AuditAction
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

type DatabaseClient = {
  insert: (table: typeof auditLogs) => {
    values: (data: NewAuditLog) => Promise<unknown>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logger Class
// ─────────────────────────────────────────────────────────────────────────────

export class AuditLogger {
  private db: DatabaseClient
  private context: AuditContext

  constructor(db: DatabaseClient, context: AuditContext) {
    this.db = db
    this.context = context
  }

  async log(change: AuditableChange): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId: this.context.tenantId,
      userId: this.context.userId,
      action: change.action,
      entityType: change.entityType,
      entityId: change.entityId,
      oldValue: change.oldValue,
      newValue: change.newValue,
      ipAddress: this.context.ipAddress,
      userAgent: this.context.userAgent,
      metadata: change.metadata,
    })
  }

  async logCreate<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    newValue: T,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "create",
      newValue,
      metadata,
    })
  }

  async logUpdate<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    oldValue: T,
    newValue: T,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "update",
      oldValue,
      newValue,
      metadata,
    })
  }

  async logDelete<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    oldValue: T,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "delete",
      oldValue,
      metadata,
    })
  }

  async logView(
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "view",
      metadata,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

export function createAuditLogger(
  db: DatabaseClient,
  context: AuditContext
): AuditLogger {
  return new AuditLogger(db, context)
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff Utility
// ─────────────────────────────────────────────────────────────────────────────

export function computeDiff<T extends Record<string, unknown>>(
  oldValue: T,
  newValue: T
): { changed: Partial<T>; added: Partial<T>; removed: Partial<T> } {
  const changed: Partial<T> = {}
  const added: Partial<T> = {}
  const removed: Partial<T> = {}

  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])

  for (const key of allKeys) {
    const typedKey = key as keyof T
    const oldVal = oldValue[typedKey]
    const newVal = newValue[typedKey]

    if (oldVal === undefined && newVal !== undefined) {
      added[typedKey] = newVal
    } else if (oldVal !== undefined && newVal === undefined) {
      removed[typedKey] = oldVal
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed[typedKey] = newVal
    }
  }

  return { changed, added, removed }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sensitive Field Redaction
// ─────────────────────────────────────────────────────────────────────────────

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "secretKey",
  "privateKey",
  "ssn",
  "creditCard",
  "cardNumber",
])

export function redactSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  additionalFields: string[] = []
): T {
  const sensitiveSet = new Set([...SENSITIVE_FIELDS, ...additionalFields])
  const redacted = { ...data }

  for (const key of Object.keys(redacted)) {
    if (sensitiveSet.has(key) || sensitiveSet.has(key.toLowerCase())) {
      redacted[key as keyof T] = "[REDACTED]" as T[keyof T]
    }
  }

  return redacted
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Helper
// ─────────────────────────────────────────────────────────────────────────────

export function withAuditLogging<TContext extends { db: DatabaseClient }>(
  getAuditContext: (ctx: TContext) => AuditContext
) {
  return (ctx: TContext): AuditLogger => {
    const auditContext = getAuditContext(ctx)
    return createAuditLogger(ctx.db, auditContext)
  }
}
