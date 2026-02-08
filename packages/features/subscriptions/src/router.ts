// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, publicProcedure, tenantProcedure } from "@nyoworks/api"
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
// Plans Router
// ─────────────────────────────────────────────────────────────────────────────

const plansRouter = router({
  create: tenantProcedure
    .input(createPlanInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.createPlan(input)
    }),

  update: tenantProcedure
    .input(updatePlanInput)
    .mutation(async ({ input, ctx }) => {
      const { planId, ...updateData } = input
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.updatePlan(planId, updateData)
    }),

  get: publicProcedure
    .input(getPlanInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId || "")
      return service.getPlan(input.planId)
    }),

  list: publicProcedure
    .input(listPlansInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId || "")
      const items = await service.listPlans({ activeOnly: input.activeOnly })
      return { items }
    }),

  delete: tenantProcedure
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

const subscriptionLifecycleRouter = router({
  subscribe: tenantProcedure
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

  cancel: tenantProcedure
    .input(cancelSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.cancelSubscription(input.subscriptionId, {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      })
    }),

  resume: tenantProcedure
    .input(resumeSubscriptionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.resumeSubscription(input.subscriptionId)
    }),

  changePlan: tenantProcedure
    .input(changePlanInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.changePlan(input.subscriptionId, input.newPlanId)
    }),

  get: tenantProcedure
    .input(getSubscriptionInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.getSubscription(input.subscriptionId)
    }),

  current: tenantProcedure.query(async ({ ctx }) => {
    const service = new SubscriptionsService(ctx.db, ctx.tenantId)
    return service.getCurrentSubscription(ctx.user.id)
  }),

  list: tenantProcedure
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

const usageRouter = router({
  checkLimit: tenantProcedure
    .input(checkLimitInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.checkLimit(ctx.user.id, input.feature, input.increment)
    }),

  record: tenantProcedure
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

  get: tenantProcedure
    .input(getUsageInput)
    .query(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      const items = await service.getUsage(ctx.user.id, input.feature)
      return { items }
    }),

  reset: tenantProcedure
    .input(resetUsageInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SubscriptionsService(ctx.db, ctx.tenantId)
      return service.resetUsage(ctx.user.id, input.feature)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionsRouter = router({
  plans: plansRouter,
  subscriptions: subscriptionLifecycleRouter,
  usage: usageRouter,
})

export type SubscriptionsRouter = typeof subscriptionsRouter
