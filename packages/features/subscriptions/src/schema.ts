// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Plans Table
// ─────────────────────────────────────────────────────────────────────────────

export const plans = pgTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  limits: jsonb("limits").$type<Record<string, number>>().default({}),
  price: integer("price").notNull(),
  interval: varchar("interval", { length: 20 }).notNull().default("month"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscription_plans_slug_idx").on(table.slug),
  index("subscription_plans_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// User Subscriptions Table
// ─────────────────────────────────────────────────────────────────────────────

export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("user_subscriptions_tenant_idx").on(table.tenantId),
  index("user_subscriptions_user_idx").on(table.userId),
  index("user_subscriptions_plan_idx").on(table.planId),
  index("user_subscriptions_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Usage Records Table
// ─────────────────────────────────────────────────────────────────────────────

export const usageRecords = pgTable("subscription_usage_records", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  subscriptionId: text("subscription_id").notNull().references(() => userSubscriptions.id, { onDelete: "cascade" }),
  feature: varchar("feature", { length: 100 }).notNull(),
  used: integer("used").notNull().default(0),
  limit: integer("limit").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("usage_records_subscription_idx").on(table.subscriptionId),
  index("usage_records_feature_idx").on(table.feature),
  index("usage_records_period_idx").on(table.periodStart, table.periodEnd),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(userSubscriptions),
}))

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  plan: one(plans, {
    fields: [userSubscriptions.planId],
    references: [plans.id],
  }),
  usageRecords: many(usageRecords),
}))

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  subscription: one(userSubscriptions, {
    fields: [usageRecords.subscriptionId],
    references: [userSubscriptions.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
export type UserSubscription = typeof userSubscriptions.$inferSelect
export type NewUserSubscription = typeof userSubscriptions.$inferInsert
export type UsageRecord = typeof usageRecords.$inferSelect
export type NewUsageRecord = typeof usageRecords.$inferInsert
