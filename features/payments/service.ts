// ═══════════════════════════════════════════════════════════════════════════════
// Payments Service
// ═══════════════════════════════════════════════════════════════════════════════

import Stripe from "stripe"
import { db, eq, and } from "../../core/database/client"
import { subscriptions, payments, invoices, paymentMethods } from "./schema"
import { createLogger } from "../../core/shared/logger"
import type { Subscription, NewSubscription, Payment, NewPayment } from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const logger = createLogger("payments-service")

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required")
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Service
// ─────────────────────────────────────────────────────────────────────────────

async function createSubscription(
  tenantId: string,
  userId: string,
  priceId: string
): Promise<Subscription> {
  const stripe = getStripeClient()

  const [user] = await db.query.users.findFirst({
    where: (users, { eq, and }) => and(eq(users.id, userId), eq(users.tenantId, tenantId)),
  })

  if (!user) {
    throw new Error("User not found")
  }

  let stripeCustomerId = await getOrCreateCustomer(tenantId, userId, user.email)

  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  })

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      tenantId,
      userId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId,
      stripePriceId: priceId,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    })
    .returning()

  logger.info({ subscriptionId: subscription.id }, "Subscription created")
  return subscription
}

async function getOrCreateCustomer(
  tenantId: string,
  userId: string,
  email: string
): Promise<string> {
  const stripe = getStripeClient()

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.userId, userId)))
    .limit(1)

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { tenantId, userId },
  })

  return customer.id
}

async function cancelSubscription(
  tenantId: string,
  subscriptionId: string,
  cancelImmediately = false
): Promise<Subscription> {
  const stripe = getStripeClient()

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.tenantId, tenantId)))
    .limit(1)

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error("Subscription not found")
  }

  if (cancelImmediately) {
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
  } else {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      status: cancelImmediately ? "canceled" : subscription.status,
      cancelAtPeriodEnd: cancelImmediately ? null : subscription.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning()

  logger.info({ subscriptionId }, "Subscription canceled")
  return updated
}

async function getSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1)

  return subscription ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Service
// ─────────────────────────────────────────────────────────────────────────────

async function createPaymentIntent(
  tenantId: string,
  userId: string,
  amount: number,
  currency: string = "usd"
): Promise<{ clientSecret: string; paymentId: string }> {
  const stripe = getStripeClient()

  const stripeCustomerId = await getOrCreateCustomer(tenantId, userId, "")

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: stripeCustomerId,
    metadata: { tenantId, userId },
  })

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      userId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      currency: currency.toUpperCase(),
      status: "pending",
    })
    .returning()

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentId: payment.id,
  }
}

async function getPaymentsByUser(tenantId: string, userId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.userId, userId)))
    .orderBy(payments.createdAt)
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleWebhookEvent(
  body: string,
  signature: string
): Promise<{ received: boolean }> {
  const stripe = getStripeClient()

  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required")
  }

  const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)

  logger.info({ eventType: event.type }, "Webhook received")

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
      break
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
      break
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
  }

  return { received: true }
}

async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  await db
    .update(payments)
    .set({
      status: "succeeded",
      updatedAt: new Date(),
    })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  await db
    .update(payments)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
}

async function handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
  await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, stripeInvoice.id))
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsService = {
  createSubscription,
  cancelSubscription,
  getSubscriptionByTenant,
  createPaymentIntent,
  getPaymentsByUser,
  handleWebhookEvent,
}
