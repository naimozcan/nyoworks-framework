// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Events Table
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull().default("track"),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  referrer: text("referrer"),
  pathname: text("pathname"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("analytics_events_tenant_idx").on(table.tenantId),
  index("analytics_events_user_idx").on(table.userId),
  index("analytics_events_session_idx").on(table.sessionId),
  index("analytics_events_name_idx").on(table.eventName),
  index("analytics_events_timestamp_idx").on(table.timestamp),
])

// ─────────────────────────────────────────────────────────────────────────────
// Pageviews Table
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsPageviews = pgTable("analytics_pageviews", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  pathname: text("pathname").notNull(),
  title: text("title"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 255 }),
  duration: integer("duration"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("analytics_pageviews_tenant_idx").on(table.tenantId),
  index("analytics_pageviews_user_idx").on(table.userId),
  index("analytics_pageviews_session_idx").on(table.sessionId),
  index("analytics_pageviews_pathname_idx").on(table.pathname),
  index("analytics_pageviews_timestamp_idx").on(table.timestamp),
])

// ─────────────────────────────────────────────────────────────────────────────
// Sessions Table
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsSessions = pgTable("analytics_sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  pageviewCount: integer("pageview_count").default(0),
  eventCount: integer("event_count").default(0),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 255 }),
  referrer: text("referrer"),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
}, (table) => [
  index("analytics_sessions_tenant_idx").on(table.tenantId),
  index("analytics_sessions_user_idx").on(table.userId),
  index("analytics_sessions_session_id_idx").on(table.sessionId),
  index("analytics_sessions_started_idx").on(table.startedAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsSessionsRelations = relations(analyticsSessions, ({ many }) => ({
  events: many(analyticsEvents),
  pageviews: many(analyticsPageviews),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert
export type AnalyticsPageview = typeof analyticsPageviews.$inferSelect
export type NewAnalyticsPageview = typeof analyticsPageviews.$inferInsert
export type AnalyticsSession = typeof analyticsSessions.$inferSelect
export type NewAnalyticsSession = typeof analyticsSessions.$inferInsert
