// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Presence Records Table
// ─────────────────────────────────────────────────────────────────────────────

export const presenceRecords = pgTable("presence_records", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  channelId: varchar("channel_id", { length: 255 }).notNull(),
  userId: text("user_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("online"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("presence_records_channel_idx").on(table.channelId),
  index("presence_records_user_idx").on(table.userId),
  index("presence_records_status_idx").on(table.status),
  index("presence_records_last_seen_idx").on(table.lastSeenAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Channels Table
// ─────────────────────────────────────────────────────────────────────────────

export const channels = pgTable("realtime_channels", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull().unique(),
  tenantId: text("tenant_id").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("public"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("realtime_channels_tenant_idx").on(table.tenantId),
  index("realtime_channels_name_idx").on(table.name),
  index("realtime_channels_type_idx").on(table.type),
])

// ─────────────────────────────────────────────────────────────────────────────
// Messages Table
// ─────────────────────────────────────────────────────────────────────────────

export const messages = pgTable("realtime_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  channelId: text("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("realtime_messages_channel_idx").on(table.channelId),
  index("realtime_messages_user_idx").on(table.userId),
  index("realtime_messages_event_idx").on(table.event),
  index("realtime_messages_created_idx").on(table.createdAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PresenceRecord = typeof presenceRecords.$inferSelect
export type NewPresenceRecord = typeof presenceRecords.$inferInsert
export type Channel = typeof channels.$inferSelect
export type NewChannel = typeof channels.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
