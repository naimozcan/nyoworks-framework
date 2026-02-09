// ═══════════════════════════════════════════════════════════════════════════════
// Google Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth Tokens Table
// ─────────────────────────────────────────────────────────────────────────────

export const googleOAuthTokens = pgTable("google_oauth_tokens", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Sync Table
// ─────────────────────────────────────────────────────────────────────────────

export const calendarSync = pgTable("calendar_sync", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  calendarId: text("calendar_id").notNull(),
  googleCalendarId: text("google_calendar_id").notNull(),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncToken: text("sync_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GoogleOAuthToken = typeof googleOAuthTokens.$inferSelect
export type NewGoogleOAuthToken = typeof googleOAuthTokens.$inferInsert
export type CalendarSync = typeof calendarSync.$inferSelect
export type NewCalendarSync = typeof calendarSync.$inferInsert

export interface GoogleEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: { email: string; responseStatus?: string }[]
  status: "confirmed" | "tentative" | "cancelled"
}

export interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  timeZone: string
  primary: boolean
}
