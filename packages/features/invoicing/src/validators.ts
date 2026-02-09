// ═══════════════════════════════════════════════════════════════════════════════
// Invoicing Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Address Validators
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceAddressSchema = z.object({
  name: z.string().min(1),
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().length(2).default("NL"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Item Validators
// ─────────────────────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100).default(21),
  total: z.number().min(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  type: z.enum(["standard", "credit_note", "debit_note"]).default("standard"),
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerAddress: invoiceAddressSchema.optional(),
  customerVatNumber: z.string().optional(),
  customerKvkNumber: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  issueDate: z.date().optional(),
  dueDate: z.date(),
  notes: z.string().optional(),
})

export const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "pending", "sent", "paid", "overdue", "cancelled"]).optional(),
  items: z.array(invoiceItemSchema).optional(),
  dueDate: z.date().optional(),
  paidAt: z.date().optional(),
  notes: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Netherlands VAT Rates (BTW)
// ─────────────────────────────────────────────────────────────────────────────

export const NL_VAT_RATES = {
  STANDARD: 21,
  REDUCED: 9,
  ZERO: 0,
} as const

export function calculateVat(amount: number, rate: number): number {
  return Math.round(amount * (rate / 100) * 100) / 100
}

export function calculateTotalWithVat(amount: number, rate: number): number {
  return Math.round((amount + calculateVat(amount, rate)) * 100) / 100
}
