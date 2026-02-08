// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Export Jobs Table
// ─────────────────────────────────────────────────────────────────────────────

export const exportJobs = pgTable("export_jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  format: varchar("format", { length: 20 }).notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>(),
  fileUrl: text("file_url"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("export_jobs_tenant_idx").on(table.tenantId),
  index("export_jobs_user_idx").on(table.userId),
  index("export_jobs_status_idx").on(table.status),
  index("export_jobs_type_idx").on(table.type),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExportJob = typeof exportJobs.$inferSelect
export type NewExportJob = typeof exportJobs.$inferInsert
