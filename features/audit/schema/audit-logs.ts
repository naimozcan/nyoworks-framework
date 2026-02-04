// ═══════════════════════════════════════════════════════════════════════════════
// Audit Logs Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, jsonb, text, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  changes: jsonb("changes").default({}),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_logs_tenant_idx").on(table.tenantId),
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_entity_idx").on(table.entity, table.entityId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_at_idx").on(table.createdAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert

export const AuditAction = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  EXPORT: "export",
  IMPORT: "import",
  VIEW: "view",
} as const
