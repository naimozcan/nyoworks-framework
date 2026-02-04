// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Events Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("session_id", { length: 64 }),
  event: varchar("event", { length: 100 }).notNull(),
  properties: jsonb("properties").default({}),
  context: jsonb("context").default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("analytics_events_tenant_idx").on(table.tenantId),
  index("analytics_events_user_idx").on(table.userId),
  index("analytics_events_event_idx").on(table.event),
  index("analytics_events_timestamp_idx").on(table.timestamp),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [analyticsEvents.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert
