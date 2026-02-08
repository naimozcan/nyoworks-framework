// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
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

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
