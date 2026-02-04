// ═══════════════════════════════════════════════════════════════════════════════
// Notification Templates Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, text, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  variables: jsonb("variables").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_templates_tenant_slug_idx").on(table.tenantId, table.slug),
  index("notification_templates_channel_idx").on(table.channel),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationTemplates.tenantId],
    references: [tenants.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationTemplate = typeof notificationTemplates.$inferSelect
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert
