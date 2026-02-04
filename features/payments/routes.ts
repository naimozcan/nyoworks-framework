// ═══════════════════════════════════════════════════════════════════════════════
// Payments Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { paymentsService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const createSubscriptionSchema = z.object({
  priceId: z.string().min(1),
})

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default("usd"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Routes
// ─────────────────────────────────────────────────────────────────────────────

paymentsRoutes.get("/subscriptions", async (c) => {
  const user = c.get("user")
  const subscription = await paymentsService.getSubscriptionByTenant(user.tid)

  return c.json({ data: subscription })
})

paymentsRoutes.post(
  "/subscriptions",
  zValidator("json", createSubscriptionSchema),
  async (c) => {
    const user = c.get("user")
    const { priceId } = c.req.valid("json")

    const subscription = await paymentsService.createSubscription(
      user.tid,
      user.sub,
      priceId
    )

    return c.json({ data: subscription }, 201)
  }
)

paymentsRoutes.delete("/subscriptions/:id", async (c) => {
  const user = c.get("user")
  const subscriptionId = c.req.param("id")
  const cancelImmediately = c.req.query("immediate") === "true"

  const subscription = await paymentsService.cancelSubscription(
    user.tid,
    subscriptionId,
    cancelImmediately
  )

  return c.json({ data: subscription })
})

// ─────────────────────────────────────────────────────────────────────────────
// Payment Routes
// ─────────────────────────────────────────────────────────────────────────────

paymentsRoutes.post(
  "/payments/checkout",
  zValidator("json", createPaymentSchema),
  async (c) => {
    const user = c.get("user")
    const { amount, currency } = c.req.valid("json")

    const result = await paymentsService.createPaymentIntent(
      user.tid,
      user.sub,
      amount,
      currency
    )

    return c.json({ data: result }, 201)
  }
)

paymentsRoutes.get("/payments", async (c) => {
  const user = c.get("user")
  const payments = await paymentsService.getPaymentsByUser(user.tid, user.sub)

  return c.json({ data: payments })
})

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Route
// ─────────────────────────────────────────────────────────────────────────────

paymentsRoutes.post("/payments/webhook", async (c) => {
  const body = await c.req.text()
  const signature = c.req.header("stripe-signature")

  if (!signature) {
    return c.json({ error: "Missing signature" }, 400)
  }

  try {
    const result = await paymentsService.handleWebhookEvent(body, signature)
    return c.json(result)
  } catch (error) {
    return c.json({ error: "Webhook processing failed" }, 400)
  }
})
