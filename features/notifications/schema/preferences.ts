// ═══════════════════════════════════════════════════════════════════════════════
// Notification Preferences Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  enabled: boolean("enabled").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_prefs_unique_idx").on(table.userId, table.channel, table.type),
  index("notification_prefs_user_idx").on(table.userId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationPreferences.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationPreference = typeof notificationPreferences.$inferSelect
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert
