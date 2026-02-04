// ═══════════════════════════════════════════════════════════════════════════════
// Session Schema - Token Management
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  userAgent: varchar("user_agent", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("sessions_user_idx").on(table.userId),
  index("sessions_token_hash_idx").on(table.tokenHash),
  index("sessions_expires_at_idx").on(table.expiresAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
