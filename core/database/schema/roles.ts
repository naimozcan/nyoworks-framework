// ═══════════════════════════════════════════════════════════════════════════════
// Role Schema - RBAC Base
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"
import { users } from "./users"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  permissions: jsonb("permissions").default([]).notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("roles_tenant_idx").on(table.tenantId),
  index("roles_tenant_name_idx").on(table.tenantId, table.name),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  users: many(users),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Default Roles
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_ROLES = [
  {
    name: "owner",
    description: "Full access to all resources",
    permissions: ["*"],
    isSystem: true,
  },
  {
    name: "admin",
    description: "Administrative access",
    permissions: [
      "users:*",
      "roles:*",
      "settings:*",
    ],
    isSystem: true,
  },
  {
    name: "member",
    description: "Standard member access",
    permissions: [
      "users:read",
      "profile:*",
    ],
    isSystem: true,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
