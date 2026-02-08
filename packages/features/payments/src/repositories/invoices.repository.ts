// ═══════════════════════════════════════════════════════════════════════════════
// Invoices Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, desc } from "drizzle-orm"
import { invoices, type Invoice, type NewInvoice } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class InvoicesRepository {
  constructor(private readonly db: unknown) {}

  async create(data: Omit<NewInvoice, "id" | "createdAt">): Promise<Invoice> {
    const db = this.db as any
    const [result] = await db
      .insert(invoices)
      .values(data)
      .returning()

    return result
  }

  async findById(id: string): Promise<Invoice | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.stripeInvoiceId, stripeInvoiceId))
      .limit(1)

    return result[0] ?? null
  }

  async findByCustomerId(customerId: string, options?: { limit?: number; offset?: number }): Promise<Invoice[]> {
    const limit = options?.limit ?? 10
    const offset = options?.offset ?? 0
    const db = this.db as any

    return db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Invoice[]> {
    const db = this.db as any
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(desc(invoices.createdAt))
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const db = this.db as any
    const [result] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning()

    return result ?? null
  }

  async updateByStripeId(stripeInvoiceId: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const db = this.db as any
    const [result] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.stripeInvoiceId, stripeInvoiceId))
      .returning()

    return result ?? null
  }

  async upsertFromStripe(
    stripeInvoice: {
      id: string
      status: string | null
      amount_due: number
      amount_paid: number
      currency: string
      invoice_pdf: string | null
      hosted_invoice_url: string | null
      period_start?: number
      period_end?: number
      status_transitions?: {
        paid_at: number | null
      }
      customer: string | { id: string }
    },
    subscriptionId: string
  ): Promise<Invoice> {
    const db = this.db as any
    const existing = await this.findByStripeInvoiceId(stripeInvoice.id)

    const customerId = typeof stripeInvoice.customer === "string"
      ? stripeInvoice.customer
      : stripeInvoice.customer.id

    const invoiceData = {
      stripeInvoiceId: stripeInvoice.id,
      customerId,
      subscriptionId,
      status: stripeInvoice.status || "unknown",
      amountDue: stripeInvoice.amount_due,
      amountPaid: stripeInvoice.amount_paid,
      currency: stripeInvoice.currency,
      invoicePdf: stripeInvoice.invoice_pdf,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
      periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
      paidAt: stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : null,
    }

    if (existing) {
      const [result] = await db
        .update(invoices)
        .set(invoiceData)
        .where(eq(invoices.id, existing.id))
        .returning()
      return result
    }

    const [result] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning()

    return result
  }
}
