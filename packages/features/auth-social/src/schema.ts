// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, text, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Social Accounts Table
// ─────────────────────────────────────────────────────────────────────────────

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  profile: jsonb("profile").$type<SocialProfile>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("social_accounts_user_idx").on(table.userId),
  index("social_accounts_provider_idx").on(table.provider),
  uniqueIndex("social_accounts_provider_account_idx").on(table.provider, table.providerAccountId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Profile Type
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialProfile {
  email?: string
  name?: string
  picture?: string
  locale?: string
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Enum
// ─────────────────────────────────────────────────────────────────────────────

export const SocialProvider = {
  GOOGLE: "google",
  APPLE: "apple",
  GITHUB: "github",
} as const

export type SocialProviderType = typeof SocialProvider[keyof typeof SocialProvider]

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const socialAccountsRelations = relations(socialAccounts, () => ({}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SocialAccount = typeof socialAccounts.$inferSelect
export type NewSocialAccount = typeof socialAccounts.$inferInsert
