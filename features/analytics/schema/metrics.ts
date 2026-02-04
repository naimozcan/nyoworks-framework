// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Metrics Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, integer, date, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  metric: varchar("metric", { length: 100 }).notNull(),
  dimension: varchar("dimension", { length: 100 }),
  dimensionValue: varchar("dimension_value", { length: 255 }),
  value: integer("value").notNull().default(0),
  date: date("date").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("analytics_metrics_unique_idx").on(
    table.tenantId,
    table.metric,
    table.dimension,
    table.dimensionValue,
    table.date
  ),
  index("analytics_metrics_tenant_date_idx").on(table.tenantId, table.date),
  index("analytics_metrics_metric_idx").on(table.metric),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsMetricsRelations = relations(analyticsMetrics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [analyticsMetrics.tenantId],
    references: [tenants.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect
export type NewAnalyticsMetric = typeof analyticsMetrics.$inferInsert
