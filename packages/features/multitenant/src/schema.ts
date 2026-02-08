// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Tenants Table
// ─────────────────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),

  settings: jsonb("settings").$type<Record<string, unknown>>(),

  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("tenants_slug_idx").on(table.slug),
  index("tenants_domain_idx").on(table.domain),
  index("tenants_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Members Table
// ─────────────────────────────────────────────────────────────────────────────

export const tenantMembers = pgTable("tenant_members", {
  id: uuid("id").primaryKey().defaultRandom(),

  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),

  role: text("role").notNull().default("member"),

  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("tenant_members_tenant_user_idx").on(table.tenantId, table.userId),
  index("tenant_members_tenant_idx").on(table.tenantId),
  index("tenant_members_user_idx").on(table.userId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Invites Table
// ─────────────────────────────────────────────────────────────────────────────

export const tenantInvites = pgTable("tenant_invites", {
  id: uuid("id").primaryKey().defaultRandom(),

  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),

  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("tenant_invites_tenant_idx").on(table.tenantId),
  index("tenant_invites_email_idx").on(table.email),
  index("tenant_invites_token_idx").on(table.token),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  invites: many(tenantInvites),
}))

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
}))

export const tenantInvitesRelations = relations(tenantInvites, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantInvites.tenantId],
    references: [tenants.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type TenantMember = typeof tenantMembers.$inferSelect
export type NewTenantMember = typeof tenantMembers.$inferInsert
export type TenantInvite = typeof tenantInvites.$inferSelect
export type NewTenantInvite = typeof tenantInvites.$inferInsert
