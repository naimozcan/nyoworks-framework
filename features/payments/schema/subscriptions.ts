// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("inactive"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: timestamp("cancel_at_period_end", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscriptions_tenant_idx").on(table.tenantId),
  index("subscriptions_user_idx").on(table.userId),
  index("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export const SubscriptionStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TRIALING: "trialing",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
} as const
