// ═══════════════════════════════════════════════════════════════════════════════
// Payments Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).unique(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  description: varchar("description", { length: 500 }),
  metadata: jsonb("metadata").default({}),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payments_tenant_idx").on(table.tenantId),
  index("payments_user_idx").on(table.userId),
  index("payments_stripe_pi_idx").on(table.stripePaymentIntentId),
  index("payments_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert

export const PaymentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const
