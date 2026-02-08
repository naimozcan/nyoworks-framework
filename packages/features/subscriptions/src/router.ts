// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, asc, desc, sql } from "drizzle-orm"
import {
  createPlanInput,
  updatePlanInput,
  getPlanInput,
  deletePlanInput,
  listPlansInput,
  subscribeInput,
  cancelSubscriptionInput,
  resumeSubscriptionInput,
  changePlanInput,
  getSubscriptionInput,
  listSubscriptionsInput,
  checkLimitInput,
  recordUsageInput,
  getUsageInput,
  resetUsageInput,
} from "./validators.js"
import { plans, userSubscriptions, usageRecords } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
}

const t = initTRPC.context<SubscriptionsContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function addInterval(date: Date, interval: string, count: number = 1): Date {
  const result = new Date(date)
  switch (interval) {
    case "day":
      result.setDate(result.getDate() + count)
      break
    case "week":
      result.setDate(result.getDate() + count * 7)
      break
    case "month":
      result.setMonth(result.getMonth() + count)
      break
    case "year":
      result.setFullYear(result.getFullYear() + count)
      break
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans Router
// ─────────────────────────────────────────────────────────────────────────────

const plansRouter = t.router({
  create: protectedProcedure
    .input(createPlanInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [plan] = await db
        .insert(plans)
        .values(input)
        .returning()

      return plan
    }),

  update: protectedProcedure
    .input(updatePlanInput)
    .mutation(async ({ input, ctx }) => {
      const { planId, ...updateData } = input
      const db = ctx.db as never

      const [plan] = await db
        .update(plans)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(plans.id, planId))
        .returning()

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
      }

      return plan
    }),

  get: t.procedure
    .input(getPlanInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1)

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
      }

      return plan
    }),

  list: t.procedure
    .input(listPlansInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { activeOnly } = input

      let query = db.select().from(plans)

      if (activeOnly) {
        query = query.where(eq(plans.isActive, true))
      }

      const items = await query.orderBy(asc(plans.sortOrder), asc(plans.name))

      return { items }
    }),

  delete: protectedProcedure
    .input(deletePlanInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const activeSubscriptions = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.planId, input.planId),
          eq(userSubscriptions.status, "active")
        ))

      if (activeSubscriptions[0]?.count > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete plan with active subscriptions",
        })
      }

      const [deleted] = await db
        .delete(plans)
        .where(eq(plans.id, input.planId))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Lifecycle Router
// ─────────────────────────────────────────────────────────────────────────────

const subscriptionLifecycleRouter = t.router({
  subscribe: protectedProcedure
    .input(subscribeInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { planId, trialDays, metadata } = input

      const [plan] = await db
        .select()
        .from(plans)
        .where(and(eq(plans.id, planId), eq(plans.isActive, true)))
        .limit(1)

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found or inactive" })
      }

      const existingSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.tenantId, ctx.tenantId),
          eq(userSubscriptions.userId, ctx.user.id),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1)

      if (existingSubscription[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has an active subscription",
        })
      }

      const now = new Date()
      const periodEnd = addInterval(now, plan.interval)
      const trialEndsAt = trialDays ? addInterval(now, "day", trialDays) : null

      const [subscription] = await db
        .insert(userSubscriptions)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          planId,
          status: trialDays ? "trialing" : "active",
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt || periodEnd,
          trialEndsAt,
          metadata,
        })
        .returning()

      const planLimits = plan.limits as Record<string, number>
      if (planLimits && Object.keys(planLimits).length > 0) {
        const usageRecordsToInsert = Object.entries(planLimits).map(([feature, limit]) => ({
          subscriptionId: subscription.id,
          feature,
          used: 0,
          limit,
          periodStart: now,
          periodEnd: trialEndsAt || periodEnd,
        }))

        await db.insert(usageRecords).values(usageRecordsToInsert)
      }

      return subscription
    }),

  cancel: protectedProcedure
    .input(cancelSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, cancelAtPeriodEnd } = input
      const db = ctx.db as never

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.id, subscriptionId),
          eq(userSubscriptions.tenantId, ctx.tenantId)
        ))
        .limit(1)

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
      }

      if (subscription.status === "canceled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription already canceled" })
      }

      const [updated] = await db
        .update(userSubscriptions)
        .set({
          status: cancelAtPeriodEnd ? subscription.status : "canceled",
          cancelAtPeriodEnd,
          canceledAt: cancelAtPeriodEnd ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning()

      return updated
    }),

  resume: protectedProcedure
    .input(resumeSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId } = input
      const db = ctx.db as never

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.id, subscriptionId),
          eq(userSubscriptions.tenantId, ctx.tenantId)
        ))
        .limit(1)

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
      }

      if (!subscription.cancelAtPeriodEnd) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription is not pending cancellation" })
      }

      const [updated] = await db
        .update(userSubscriptions)
        .set({
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning()

      return updated
    }),

  changePlan: protectedProcedure
    .input(changePlanInput)
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, newPlanId } = input
      const db = ctx.db as never

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.id, subscriptionId),
          eq(userSubscriptions.tenantId, ctx.tenantId)
        ))
        .limit(1)

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
      }

      const [newPlan] = await db
        .select()
        .from(plans)
        .where(and(eq(plans.id, newPlanId), eq(plans.isActive, true)))
        .limit(1)

      if (!newPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "New plan not found or inactive" })
      }

      const now = new Date()
      const periodEnd = addInterval(now, newPlan.interval)

      const [updated] = await db
        .update(userSubscriptions)
        .set({
          planId: newPlanId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: now,
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning()

      await db
        .delete(usageRecords)
        .where(eq(usageRecords.subscriptionId, subscriptionId))

      const planLimits = newPlan.limits as Record<string, number>
      if (planLimits && Object.keys(planLimits).length > 0) {
        const usageRecordsToInsert = Object.entries(planLimits).map(([feature, limit]) => ({
          subscriptionId: subscription.id,
          feature,
          used: 0,
          limit,
          periodStart: now,
          periodEnd,
        }))

        await db.insert(usageRecords).values(usageRecordsToInsert)
      }

      return updated
    }),

  get: protectedProcedure
    .input(getSubscriptionInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.id, input.subscriptionId),
          eq(userSubscriptions.tenantId, ctx.tenantId)
        ))
        .limit(1)

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
      }

      return subscription
    }),

  current: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.tenantId, ctx.tenantId),
        eq(userSubscriptions.userId, ctx.user.id)
      ))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1)

    if (!subscription) {
      return null
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1)

    return {
      ...subscription,
      plan,
    }
  }),

  list: protectedProcedure
    .input(listSubscriptionsInput)
    .query(async ({ input, ctx }) => {
      const { status, limit, offset } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.tenantId, ctx.tenantId))

      if (status) {
        query = query.where(eq(userSubscriptions.status, status))
      }

      const items = await query
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Usage Router
// ─────────────────────────────────────────────────────────────────────────────

const usageRouter = t.router({
  checkLimit: protectedProcedure
    .input(checkLimitInput)
    .query(async ({ input, ctx }) => {
      const { feature, increment } = input
      const db = ctx.db as never

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.tenantId, ctx.tenantId),
          eq(userSubscriptions.userId, ctx.user.id),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1)

      if (!subscription) {
        return {
          allowed: false,
          reason: "no_subscription",
          used: 0,
          limit: 0,
          remaining: 0,
        }
      }

      const now = new Date()
      const [usage] = await db
        .select()
        .from(usageRecords)
        .where(and(
          eq(usageRecords.subscriptionId, subscription.id),
          eq(usageRecords.feature, feature)
        ))
        .limit(1)

      if (!usage) {
        return {
          allowed: true,
          reason: "unlimited",
          used: 0,
          limit: -1,
          remaining: -1,
        }
      }

      const remaining = usage.limit - usage.used
      const allowed = remaining >= increment

      return {
        allowed,
        reason: allowed ? "ok" : "limit_exceeded",
        used: usage.used,
        limit: usage.limit,
        remaining: Math.max(0, remaining),
      }
    }),

  record: protectedProcedure
    .input(recordUsageInput)
    .mutation(async ({ input, ctx }) => {
      const { feature, quantity, subscriptionId: inputSubscriptionId } = input
      const db = ctx.db as never

      let subscriptionId = inputSubscriptionId

      if (!subscriptionId) {
        const [subscription] = await db
          .select()
          .from(userSubscriptions)
          .where(and(
            eq(userSubscriptions.tenantId, ctx.tenantId),
            eq(userSubscriptions.userId, ctx.user.id),
            eq(userSubscriptions.status, "active")
          ))
          .limit(1)

        if (!subscription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" })
        }

        subscriptionId = subscription.id
      }

      const [usage] = await db
        .select()
        .from(usageRecords)
        .where(and(
          eq(usageRecords.subscriptionId, subscriptionId),
          eq(usageRecords.feature, feature)
        ))
        .limit(1)

      if (!usage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Usage tracking not configured for feature: ${feature}`,
        })
      }

      const newUsed = usage.used + quantity

      if (newUsed > usage.limit) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Usage limit exceeded for feature: ${feature}`,
        })
      }

      const [updated] = await db
        .update(usageRecords)
        .set({
          used: newUsed,
          updatedAt: new Date(),
        })
        .where(eq(usageRecords.id, usage.id))
        .returning()

      return updated
    }),

  get: protectedProcedure
    .input(getUsageInput)
    .query(async ({ input, ctx }) => {
      const { feature, subscriptionId: inputSubscriptionId } = input
      const db = ctx.db as never

      let subscriptionId = inputSubscriptionId

      if (!subscriptionId) {
        const [subscription] = await db
          .select()
          .from(userSubscriptions)
          .where(and(
            eq(userSubscriptions.tenantId, ctx.tenantId),
            eq(userSubscriptions.userId, ctx.user.id),
            eq(userSubscriptions.status, "active")
          ))
          .limit(1)

        if (!subscription) {
          return { items: [] }
        }

        subscriptionId = subscription.id
      }

      let query = db
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.subscriptionId, subscriptionId))

      if (feature) {
        query = query.where(eq(usageRecords.feature, feature))
      }

      const items = await query.orderBy(asc(usageRecords.feature))

      return { items }
    }),

  reset: protectedProcedure
    .input(resetUsageInput)
    .mutation(async ({ input, ctx }) => {
      const { feature, subscriptionId: inputSubscriptionId } = input
      const db = ctx.db as never

      let subscriptionId = inputSubscriptionId

      if (!subscriptionId) {
        const [subscription] = await db
          .select()
          .from(userSubscriptions)
          .where(and(
            eq(userSubscriptions.tenantId, ctx.tenantId),
            eq(userSubscriptions.userId, ctx.user.id),
            eq(userSubscriptions.status, "active")
          ))
          .limit(1)

        if (!subscription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" })
        }

        subscriptionId = subscription.id
      }

      const [updated] = await db
        .update(usageRecords)
        .set({
          used: 0,
          updatedAt: new Date(),
        })
        .where(and(
          eq(usageRecords.subscriptionId, subscriptionId),
          eq(usageRecords.feature, feature)
        ))
        .returning()

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usage record not found" })
      }

      return updated
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionsRouter = t.router({
  plans: plansRouter,
  subscriptions: subscriptionLifecycleRouter,
  usage: usageRouter,
})

export type SubscriptionsRouter = typeof subscriptionsRouter
