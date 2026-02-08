// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────────────

export const auditAction = z.enum([
  "create",
  "update",
  "delete",
  "view",
  "export",
  "import",
  "login",
  "logout",
  "permission_change",
  "setting_change",
])

// ─────────────────────────────────────────────────────────────────────────────
// Create Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export const createAuditLogInput = z.object({
  action: auditAction,
  entityType: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  entityId: z.string().min(1).max(255),
  oldValue: z.record(z.string(), z.unknown()).optional(),
  newValue: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(PAGINATION.MAX_LIMIT * 10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// List Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export const listAuditLogsInput = z.object({
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),

  userId: z.string().uuid().optional(),
  action: auditAction.optional(),
  entityType: z.string().max(PAGINATION.MAX_LIMIT).optional(),
  entityId: z.string().max(255).optional(),

  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  search: z.string().max(200).optional(),

  sortBy: z.enum(["createdAt", "action", "entityType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export const getAuditLogInput = z.object({
  auditLogId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get Entity History
// ─────────────────────────────────────────────────────────────────────────────

export const getEntityHistoryInput = z.object({
  entityType: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  entityId: z.string().min(1).max(255),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get User Activity
// ─────────────────────────────────────────────────────────────────────────────

export const getUserActivityInput = z.object({
  userId: z.string().uuid(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Output
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogOutput = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: auditAction,
  entityType: z.string(),
  entityId: z.string(),
  oldValue: z.record(z.string(), z.unknown()).nullable(),
  newValue: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction = z.infer<typeof auditAction>
export type CreateAuditLogInput = z.infer<typeof createAuditLogInput>
export type ListAuditLogsInput = z.infer<typeof listAuditLogsInput>
export type GetAuditLogInput = z.infer<typeof getAuditLogInput>
export type GetEntityHistoryInput = z.infer<typeof getEntityHistoryInput>
export type GetUserActivityInput = z.infer<typeof getUserActivityInput>
export type AuditLogOutput = z.infer<typeof auditLogOutput>
