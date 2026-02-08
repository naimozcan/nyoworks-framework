// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Customers Table
// ─────────────────────────────────────────────────────────────────────────────

export const customers = pgTable("payment_customers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payment_customers_user_idx").on(table.userId),
  index("payment_customers_tenant_idx").on(table.tenantId),
  index("payment_customers_stripe_idx").on(table.stripeCustomerId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions Table
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptions = pgTable("payment_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payment_subscriptions_customer_idx").on(table.customerId),
  index("payment_subscriptions_stripe_idx").on(table.stripeSubscriptionId),
  index("payment_subscriptions_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Invoices Table
// ─────────────────────────────────────────────────────────────────────────────

export const invoices = pgTable("payment_invoices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull(),
  amountDue: integer("amount_due").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  invoicePdf: text("invoice_pdf"),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payment_invoices_customer_idx").on(table.customerId),
  index("payment_invoices_subscription_idx").on(table.subscriptionId),
  index("payment_invoices_stripe_idx").on(table.stripeInvoiceId),
  index("payment_invoices_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Payment Methods Table
// ─────────────────────────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  cardBrand: varchar("card_brand", { length: 50 }),
  cardLast4: varchar("card_last4", { length: 4 }),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payment_methods_customer_idx").on(table.customerId),
  index("payment_methods_stripe_idx").on(table.stripePaymentMethodId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  paymentMethods: many(paymentMethods),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [subscriptions.customerId],
    references: [customers.id],
  }),
  invoices: many(invoices),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  customer: one(customers, {
    fields: [paymentMethods.customerId],
    references: [customers.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type PaymentMethod = typeof paymentMethods.$inferSelect
export type NewPaymentMethod = typeof paymentMethods.$inferInsert
