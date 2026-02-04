// ═══════════════════════════════════════════════════════════════════════════════
// Payment Methods Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }).unique(),
  type: varchar("type", { length: 50 }).notNull(),
  last4: varchar("last4", { length: 4 }),
  brand: varchar("brand", { length: 50 }),
  expMonth: varchar("exp_month", { length: 2 }),
  expYear: varchar("exp_year", { length: 4 }),
  isDefault: boolean("is_default").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payment_methods_tenant_idx").on(table.tenantId),
  index("payment_methods_user_idx").on(table.userId),
  index("payment_methods_stripe_pm_idx").on(table.stripePaymentMethodId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentMethods.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethod = typeof paymentMethods.$inferSelect
export type NewPaymentMethod = typeof paymentMethods.$inferInsert

export const PaymentMethodType = {
  CARD: "card",
  SEPA_DEBIT: "sepa_debit",
  IDEAL: "ideal",
  BANCONTACT: "bancontact",
} as const
