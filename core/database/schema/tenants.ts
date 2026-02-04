// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Schema - Multi-tenancy Base
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"
import { roles } from "./roles"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  settings: jsonb("settings").default({}),
  plan: varchar("plan", { length: 50 }).default("free"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  roles: many(roles),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
