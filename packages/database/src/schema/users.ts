// ═══════════════════════════════════════════════════════════════════════════════
// User Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { tenants } from "./tenants"
import { roles } from "./roles"
import { sessions } from "./sessions"

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("users_tenant_email_idx").on(table.tenantId, table.email),
  index("users_tenant_idx").on(table.tenantId),
])

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  sessions: many(sessions),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
