// ═══════════════════════════════════════════════════════════════════════════════
// Invoicing Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, pgEnum, numeric, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "pending",
  "sent",
  "paid",
  "overdue",
  "cancelled",
])

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "standard",
  "credit_note",
  "debit_note",
])

// ─────────────────────────────────────────────────────────────────────────────
// Invoices Table
// ─────────────────────────────────────────────────────────────────────────────

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  type: invoiceTypeEnum("type").notNull().default("standard"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  customerId: text("customer_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerAddress: jsonb("customer_address").$type<InvoiceAddress>(),
  customerVatNumber: text("customer_vat_number"),
  customerKvkNumber: text("customer_kvk_number"),
  supplierAddress: jsonb("supplier_address").$type<InvoiceAddress>(),
  supplierVatNumber: text("supplier_vat_number"),
  supplierKvkNumber: text("supplier_kvk_number"),
  supplierIban: text("supplier_iban"),
  items: jsonb("items").$type<InvoiceItem[]>().notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR").notNull(),
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  peppolId: text("peppol_id"),
  peppolSent: boolean("peppol_sent").default(false),
  ublXml: text("ubl_xml"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceAddress {
  name: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  total: number
}

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type InvoiceStatus = "draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled"
export type InvoiceType = "standard" | "credit_note" | "debit_note"
