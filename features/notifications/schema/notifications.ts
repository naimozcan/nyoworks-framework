// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, text, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  data: jsonb("data").default({}),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notifications_tenant_user_idx").on(table.tenantId, table.userId),
  index("notifications_is_read_idx").on(table.isRead),
  index("notifications_type_idx").on(table.type),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export const NotificationChannel = {
  EMAIL: "email",
  PUSH: "push",
  SMS: "sms",
  IN_APP: "in_app",
} as const

export const NotificationType = {
  SYSTEM: "system",
  MARKETING: "marketing",
  TRANSACTIONAL: "transactional",
  REMINDER: "reminder",
} as const
