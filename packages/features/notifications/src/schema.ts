// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, boolean, integer, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const notificationChannelEnum = pgEnum("notification_channel", ["email", "sms", "push", "in_app"])
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "delivered", "failed", "read"])

// ─────────────────────────────────────────────────────────────────────────────
// Notification Templates
// ─────────────────────────────────────────────────────────────────────────────

export const notificationTemplates = pgTable("notification_templates", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),

  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),

  channel: notificationChannelEnum("channel").notNull(),

  subject: text("subject"),
  body: text("body").notNull(),
  htmlBody: text("html_body"),

  variables: jsonb("variables").$type<string[]>(),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),

  templateId: text("template_id").references(() => notificationTemplates.id),

  userId: text("user_id"),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  recipientDeviceToken: text("recipient_device_token"),

  channel: notificationChannelEnum("channel").notNull(),
  status: notificationStatusEnum("status").notNull().default("pending"),

  subject: text("subject"),
  body: text("body").notNull(),
  htmlBody: text("html_body"),

  data: jsonb("data").$type<Record<string, unknown>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),

  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),

  scheduledFor: timestamp("scheduled_for"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// User Notification Preferences
// ─────────────────────────────────────────────────────────────────────────────

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),

  emailEnabled: boolean("email_enabled").notNull().default(true),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),

  marketingEmails: boolean("marketing_emails").notNull().default(true),
  productUpdates: boolean("product_updates").notNull().default(true),
  securityAlerts: boolean("security_alerts").notNull().default(true),

  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  timezone: text("timezone").default("UTC"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Push Devices
// ─────────────────────────────────────────────────────────────────────────────

export const pushDevices = pgTable("push_devices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),

  deviceToken: text("device_token").notNull(),
  platform: text("platform").notNull(),
  deviceName: text("device_name"),

  isActive: boolean("is_active").notNull().default(true),

  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Email Logs
// ─────────────────────────────────────────────────────────────────────────────

export const emailLogs = pgTable("email_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  notificationId: text("notification_id").references(() => notifications.id),

  provider: text("provider").notNull(),
  providerId: text("provider_id"),

  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),

  status: text("status").notNull(),
  statusDetails: jsonb("status_details").$type<Record<string, unknown>>(),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const notificationTemplatesRelations = relations(notificationTemplates, ({ many }) => ({
  notifications: many(notifications),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
}))

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  notification: one(notifications, {
    fields: [emailLogs.notificationId],
    references: [notifications.id],
  }),
}))
