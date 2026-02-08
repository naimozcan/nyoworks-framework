// ═══════════════════════════════════════════════════════════════════════════════
// Payments Service
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import type Stripe from "stripe"
import { getStripeClient, verifyWebhookSignature } from "../stripe.js"
import {
  CustomersRepository,
  SubscriptionsRepository,
  InvoicesRepository,
  PaymentMethodsRepository,
} from "../repositories/index.js"
import type { Subscription, PaymentMethod } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CheckoutSessionInput {
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
  email: string
  metadata?: Record<string, string>
}

export interface CheckoutSessionResult {
  sessionId: string
  url: string
}

export interface PortalSessionResult {
  url: string
}

export interface SubscriptionDetails {
  id: string
  status: string
  priceId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface InvoiceItem {
  id: string
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  createdAt: Date
}

export interface PlanItem {
  id: string
  name: string
  description: string | null
  unitAmount: number | null
  currency: string
  interval: string | undefined
  intervalCount: number | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentsService {
  private readonly stripe: Stripe
  private readonly customersRepo: CustomersRepository
  private readonly subscriptionsRepo: SubscriptionsRepository
  private readonly invoicesRepo: InvoicesRepository
  private readonly paymentMethodsRepo: PaymentMethodsRepository

  constructor(
    db: unknown,
    private readonly tenantId: string
  ) {
    this.stripe = getStripeClient()
    this.customersRepo = new CustomersRepository(db, tenantId)
    this.subscriptionsRepo = new SubscriptionsRepository(db)
    this.invoicesRepo = new InvoicesRepository(db)
    this.paymentMethodsRepo = new PaymentMethodsRepository(db)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Checkout
  // ─────────────────────────────────────────────────────────────────────────────

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer_email: input.email,
      line_items: [
        {
          price: input.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        userId: input.userId,
        tenantId: this.tenantId,
        ...input.metadata,
      },
    })

    if (!session.url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      })
    }

    return {
      sessionId: session.id,
      url: session.url,
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    const customer = await this.customersRepo.findById(customerId)

    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      })
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl,
    })

    return {
      url: session.url,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────────

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

    const item = subscription.items.data[0]
    const priceId = item ? (typeof item.price === "string" ? item.price : item.price.id) : ""

    const periodStart = (subscription as { current_period_start?: number }).current_period_start ?? 0
    const periodEnd = (subscription as { current_period_end?: number }).current_period_end ?? 0

    return {
      id: subscription.id,
      status: subscription.status,
      priceId,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<void> {
    if (cancelAtPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId)
    }

    const localSub = await this.subscriptionsRepo.findByStripeSubscriptionId(subscriptionId)
    if (localSub) {
      await this.subscriptionsRepo.updateByStripeId(subscriptionId, {
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? null : new Date(),
        status: cancelAtPeriodEnd ? localSub.status : "canceled",
      })
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const customer = await this.customersRepo.findByUserId(userId)
    if (!customer) {
      return null
    }

    return this.subscriptionsRepo.findActiveByCustomerId(customer.id)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Invoices
  // ─────────────────────────────────────────────────────────────────────────────

  async listInvoices(customerId: string, limit: number = 10): Promise<{ invoices: InvoiceItem[]; hasMore: boolean }> {
    const customer = await this.customersRepo.findById(customerId)

    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      })
    }

    const invoices = await this.stripe.invoices.list({
      customer: customer.stripeCustomerId,
      limit,
    })

    return {
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        status: invoice.status || "unknown",
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        invoicePdf: invoice.invoice_pdf ?? null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        createdAt: new Date(invoice.created * 1000),
      })),
      hasMore: invoices.has_more,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plans
  // ─────────────────────────────────────────────────────────────────────────────

  async getPlans(): Promise<PlanItem[]> {
    const prices = await this.stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"],
    })

    return prices.data.map((price) => {
      const product = price.product as { name: string; description: string | null }
      return {
        id: price.id,
        name: product.name,
        description: product.description,
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment Methods
  // ─────────────────────────────────────────────────────────────────────────────

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodsRepo.findByCustomerId(customerId)
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    const customer = await this.customersRepo.findById(customerId)
    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      })
    }

    await this.stripe.customers.update(customer.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    await this.paymentMethodsRepo.setDefault(customerId, paymentMethodId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Webhooks
  // ─────────────────────────────────────────────────────────────────────────────

  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const event = verifyWebhookSignature(payload, signature)

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case "customer.created":
        await this.handleCustomerCreated(event.data.object as Stripe.Customer)
        break
      case "payment_method.attached":
        await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break
      case "payment_method.detached":
        await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod)
        break
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId
    const tenantId = session.metadata?.tenantId

    if (!userId || !tenantId || !session.customer) {
      return
    }

    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id

    await this.customersRepo.getOrCreate(
      userId,
      session.customer_email || "",
      stripeCustomerId
    )
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const existing = await this.subscriptionsRepo.findByStripeSubscriptionId(subscription.id)
    const periodStart = (subscription as { current_period_start?: number }).current_period_start ?? 0
    const periodEnd = (subscription as { current_period_end?: number }).current_period_end ?? 0

    if (existing) {
      await this.subscriptionsRepo.updateByStripeId(subscription.id, {
        status: subscription.status,
        stripePriceId: subscription.items.data[0]?.price.id || existing.stripePriceId,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      })
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.subscriptionsRepo.updateByStripeId(subscription.id, {
      status: "canceled",
      canceledAt: new Date(),
    })
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSub = (invoice as { subscription?: string | { id: string } }).subscription
    if (!invoiceSub || !invoice.customer) {
      return
    }

    const subscriptionId = typeof invoiceSub === "string" ? invoiceSub : invoiceSub.id

    const subscription = await this.subscriptionsRepo.findByStripeSubscriptionId(subscriptionId)
    if (subscription) {
      const customer = typeof invoice.customer === "string"
        ? invoice.customer
        : { id: (invoice.customer as { id: string }).id }
      const invoiceData = {
        id: invoice.id,
        status: invoice.status ?? "unknown",
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        invoice_pdf: invoice.invoice_pdf ?? null,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        customer,
      }
      await this.invoicesRepo.upsertFromStripe(invoiceData, subscription.id)
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSub = (invoice as { subscription?: string | { id: string } }).subscription
    if (!invoiceSub || !invoice.customer) {
      return
    }

    const subscriptionId = typeof invoiceSub === "string" ? invoiceSub : invoiceSub.id

    const subscription = await this.subscriptionsRepo.findByStripeSubscriptionId(subscriptionId)
    if (subscription) {
      const customer = typeof invoice.customer === "string"
        ? invoice.customer
        : { id: (invoice.customer as { id: string }).id }
      const invoiceData = {
        id: invoice.id,
        status: invoice.status ?? "unknown",
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        invoice_pdf: invoice.invoice_pdf ?? null,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        customer,
      }
      await this.invoicesRepo.upsertFromStripe(invoiceData, subscription.id)
    }
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    const userId = customer.metadata?.userId
    const tenantId = customer.metadata?.tenantId

    if (!userId || !tenantId) {
      return
    }

    await this.customersRepo.getOrCreate(
      userId,
      customer.email || "",
      customer.id,
      customer.name || undefined
    )
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    if (!paymentMethod.customer) {
      return
    }

    const stripeCustomerId = typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer.id

    const customer = await this.customersRepo.findByStripeCustomerId(stripeCustomerId)
    if (!customer) {
      return
    }

    await this.paymentMethodsRepo.createFromStripe(paymentMethod, customer.id)
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    await this.paymentMethodsRepo.deleteByStripeId(paymentMethod.id)
  }
}
