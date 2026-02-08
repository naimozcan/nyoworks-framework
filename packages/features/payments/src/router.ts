// ═══════════════════════════════════════════════════════════════════════════════
// Payments Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { z } from "zod"
import { getStripeClient } from "./stripe.js"
import {
  createCheckoutSessionInput,
  createPortalSessionInput,
  getSubscriptionInput,
  cancelSubscriptionInput,
  listInvoicesInput,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type (to be extended by consuming app)
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentsContext {
  user?: { id: string; email: string }
  tenantId?: string
}

const t = initTRPC.context<PaymentsContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsRouter = t.router({
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

      return {
        id: subscription.id,
        status: subscription.status,
        priceId: typeof subscription.items.data[0].price === "string"
          ? subscription.items.data[0].price
          : subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
        starting_after: input.offset > 0 ? undefined : undefined,
      })

      return {
        invoices: invoices.data.map((invoice) => ({
          id: invoice.id,
          status: invoice.status || "unknown",
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          invoicePdf: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          createdAt: new Date(invoice.created * 1000),
        })),
        hasMore: invoices.has_more,
      }
    }),

  getPlans: t.procedure.query(async () => {
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
