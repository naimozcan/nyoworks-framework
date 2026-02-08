// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Session
// ─────────────────────────────────────────────────────────────────────────────

export const createCheckoutSessionInput = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

export const checkoutSessionOutput = z.object({
  sessionId: z.string(),
  url: z.string().url(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Billing Portal
// ─────────────────────────────────────────────────────────────────────────────

export const createPortalSessionInput = z.object({
  customerId: z.string().uuid(),
  returnUrl: z.string().url(),
})

export const portalSessionOutput = z.object({
  url: z.string().url(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionStatus = z.enum([
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
])

export const getSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
})

export const cancelSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
  cancelAtPeriodEnd: z.boolean().default(true),
})

export const subscriptionOutput = z.object({
  id: z.string().uuid(),
  status: subscriptionStatus,
  priceId: z.string(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export const listInvoicesInput = z.object({
  customerId: z.string().uuid(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

export const invoiceOutput = z.object({
  id: z.string().uuid(),
  status: z.string(),
  amountDue: z.number(),
  amountPaid: z.number(),
  currency: z.string(),
  invoicePdf: z.string().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────────────────────────────────────

export const webhookEventTypes = z.enum([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.created",
  "customer.updated",
  "payment_method.attached",
  "payment_method.detached",
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionInput>
export type CheckoutSessionOutput = z.infer<typeof checkoutSessionOutput>
export type CreatePortalSessionInput = z.infer<typeof createPortalSessionInput>
export type PortalSessionOutput = z.infer<typeof portalSessionOutput>
export type SubscriptionStatus = z.infer<typeof subscriptionStatus>
export type GetSubscriptionInput = z.infer<typeof getSubscriptionInput>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionInput>
export type SubscriptionOutput = z.infer<typeof subscriptionOutput>
export type ListInvoicesInput = z.infer<typeof listInvoicesInput>
export type InvoiceOutput = z.infer<typeof invoiceOutput>
export type WebhookEventType = z.infer<typeof webhookEventTypes>
