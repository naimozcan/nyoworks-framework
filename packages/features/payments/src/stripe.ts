// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - Stripe Client
// ═══════════════════════════════════════════════════════════════════════════════

import Stripe from "stripe"
import { getStripeEnv } from "@nyoworks/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Client
// ─────────────────────────────────────────────────────────────────────────────

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const stripeEnv = getStripeEnv()
    if (!stripeEnv?.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    stripeClient = new Stripe(stripeEnv.STRIPE_SECRET_KEY)
  }
  return stripeClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Verification
// ─────────────────────────────────────────────────────────────────────────────

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripeEnv = getStripeEnv()
  if (!stripeEnv?.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set")
  }

  const stripe = getStripeClient()
  return stripe.webhooks.constructEvent(payload, signature, stripeEnv.STRIPE_WEBHOOK_SECRET)
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const STRIPE_WEBHOOK_EVENTS = [
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
] as const

export type StripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number]
