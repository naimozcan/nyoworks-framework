// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, publicProcedure, protectedProcedure } from "@nyoworks/api"
import { getStripeClient } from "./stripe.js"
import {
  createCheckoutSessionInput,
  createPortalSessionInput,
  getSubscriptionInput,
  cancelSubscriptionInput,
  listInvoicesInput,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsRouter = router({
  createCheckoutSession: protectedProcedure
    .input(createCheckoutSessionInput)
    .mutation(async ({ input, ctx }) => {
      const stripe = getStripeClient()

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email,
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
          userId: ctx.user.id,
          tenantId: ctx.tenantId || "",
          ...input.metadata,
        },
      })

      return {
        sessionId: session.id,
        url: session.url!,
      }
    }),

  createPortalSession: protectedProcedure
    .input(createPortalSessionInput)
    .mutation(async ({ input }) => {
      const stripe = getStripeClient()

      const session = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      })

      return {
        url: session.url,
      }
    }),

  getSubscription: protectedProcedure
    .input(getSubscriptionInput)
    .query(async ({ input }) => {
      const stripe = getStripeClient()

      const subscription = await stripe.subscriptions.retrieve(input.subscriptionId)

      const item = subscription.items.data[0]
      const priceId = item ? (typeof item.price === "string" ? item.price : item.price.id) : ""

      const sub = subscription as unknown as {
        current_period_start: number
        current_period_end: number
      }

      return {
        id: subscription.id,
        status: subscription.status,
        priceId,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    }),

  cancelSubscription: protectedProcedure
    .input(cancelSubscriptionInput)
    .mutation(async ({ input }) => {
      const stripe = getStripeClient()

      if (input.cancelAtPeriodEnd) {
        await stripe.subscriptions.update(input.subscriptionId, {
          cancel_at_period_end: true,
        })
      } else {
        await stripe.subscriptions.cancel(input.subscriptionId)
      }

      return { success: true }
    }),

  listInvoices: protectedProcedure
    .input(listInvoicesInput)
    .query(async ({ input }) => {
      const stripe = getStripeClient()

      const invoices = await stripe.invoices.list({
        customer: input.customerId,
        limit: input.limit,
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
    }),

  getPlans: publicProcedure.query(async () => {
    const stripe = getStripeClient()

    const prices = await stripe.prices.list({
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
  }),
})

export type PaymentsRouter = typeof paymentsRouter
