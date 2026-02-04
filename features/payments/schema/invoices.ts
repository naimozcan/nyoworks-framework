// ═══════════════════════════════════════════════════════════════════════════════
// Invoices Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"
import { subscriptions } from "./subscriptions"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).unique(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  amount: integer("amount").notNull(),
  tax: integer("tax").default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("invoices_tenant_idx").on(table.tenantId),
  index("invoices_user_idx").on(table.userId),
  index("invoices_stripe_inv_idx").on(table.stripeInvoiceId),
  index("invoices_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

export const InvoiceStatus = {
  DRAFT: "draft",
  OPEN: "open",
  PAID: "paid",
  VOID: "void",
  UNCOLLECTIBLE: "uncollectible",
} as const
