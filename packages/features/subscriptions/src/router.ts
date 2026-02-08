// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
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
import { SubscriptionsService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
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
// Plans Router
// ─────────────────────────────────────────────────────────────────────────────

const plansRouter = t.router({
  create: protectedProcedure
    .input(createPlanInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.createPlan(input)
    }),

  update: protectedProcedure
    .input(updatePlanInput)
    .mutation(async ({ input, ctx }) => {
      const { planId, ...updateData } = input
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.updatePlan(planId, updateData)
    }),

  get: t.procedure
    .input(getPlanInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId || "")
      return service.getPlan(input.planId)
    }),

  list: t.procedure
    .input(listPlansInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId || "")
      const items = await service.listPlans({ activeOnly: input.activeOnly })
      return { items }
    }),

  delete: protectedProcedure
    .input(deletePlanInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      await service.deletePlan(input.planId)
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
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.subscribe({
        userId: ctx.user.id,
        planId: input.planId,
        trialDays: input.trialDays,
        metadata: input.metadata,
      })
    }),

  cancel: protectedProcedure
    .input(cancelSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.cancelSubscription(input.subscriptionId, {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      })
    }),

  resume: protectedProcedure
    .input(resumeSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.resumeSubscription(input.subscriptionId)
    }),

  changePlan: protectedProcedure
    .input(changePlanInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.changePlan(input.subscriptionId, input.newPlanId)
    }),

  get: protectedProcedure
    .input(getSubscriptionInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.getSubscription(input.subscriptionId)
    }),

  current: protectedProcedure.query(async ({ ctx }) => {
    const service = new SubscriptionsService(ctx.db, ctx.tenantId)
    return service.getCurrentSubscription(ctx.user.id)
  }),

  list: protectedProcedure
    .input(listSubscriptionsInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      const items = await service.listSubscriptions(input)
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
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.checkLimit(ctx.user.id, input.feature, input.increment)
    }),

  record: protectedProcedure
    .input(recordUsageInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.recordUsage(
        ctx.user.id,
        input.feature,
        input.quantity,
        input.subscriptionId
      )
    }),

  get: protectedProcedure
    .input(getUsageInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      const items = await service.getUsage(ctx.user.id, input.feature)
      return { items }
    }),

  reset: protectedProcedure
    .input(resetUsageInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.resetUsage(ctx.user.id, input.feature)
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
