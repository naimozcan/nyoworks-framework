// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import {
  PlansRepository,
  SubscriptionsRepository,
  UsageRepository,
} from "../repositories/index.js"
import type { Plan, UserSubscription, UsageRecord } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubscribeInput {
  userId: string
  planId: string
  trialDays?: number
  metadata?: Record<string, unknown>
}

export interface SubscriptionWithPlan extends UserSubscription {
  plan: Plan | null
}

export interface UsageLimitCheck {
  allowed: boolean
  reason: "ok" | "limit_exceeded" | "no_subscription" | "unlimited"
  used: number
  limit: number
  remaining: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
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
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class SubscriptionsService {
  private readonly plansRepo: PlansRepository
  private readonly subscriptionsRepo: SubscriptionsRepository
  private readonly usageRepo: UsageRepository

  constructor(db: DrizzleDatabase, tenantId: string) {
    this.plansRepo = new PlansRepository(db)
    this.subscriptionsRepo = new SubscriptionsRepository(db, tenantId)
    this.usageRepo = new UsageRepository(db)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plans
  // ─────────────────────────────────────────────────────────────────────────────

  async createPlan(data: {
    name: string
    slug: string
    description?: string
    features?: string[]
    limits?: Record<string, number>
    price: number
    interval?: string
    sortOrder?: number
    metadata?: Record<string, unknown>
  }): Promise<Plan> {
    const existingSlug = await this.plansRepo.findBySlug(data.slug)
    if (existingSlug) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Plan with this slug already exists",
      })
    }

    return this.plansRepo.create({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      features: data.features ?? [],
      limits: data.limits ?? {},
      price: data.price,
      interval: data.interval ?? "month",
      isActive: true,
      sortOrder: data.sortOrder ?? 0,
      metadata: data.metadata ?? null,
    })
  }

  async updatePlan(planId: string, data: Partial<Plan>): Promise<Plan> {
    const plan = await this.plansRepo.findById(planId)
    if (!plan) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
    }

    const updated = await this.plansRepo.update(planId, data)
    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    return updated
  }

  async getPlan(planId: string): Promise<Plan> {
    const plan = await this.plansRepo.findById(planId)
    if (!plan) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
    }

    return plan
  }

  async listPlans(options?: { activeOnly?: boolean }): Promise<Plan[]> {
    return this.plansRepo.findAll(options)
  }

  async deletePlan(planId: string): Promise<void> {
    const hasActive = await this.plansRepo.hasActiveSubscriptions(planId)
    if (hasActive) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete plan with active subscriptions",
      })
    }

    const deleted = await this.plansRepo.delete(planId)
    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────────

  async subscribe(input: SubscribeInput): Promise<UserSubscription> {
    const plan = await this.plansRepo.findActive(input.planId)
    if (!plan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Plan not found or inactive",
      })
    }

    const existingSubscription = await this.subscriptionsRepo.findActiveByUserId(input.userId)
    if (existingSubscription) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User already has an active subscription",
      })
    }

    const now = new Date()
    const periodEnd = addInterval(now, plan.interval)
    const trialEndsAt = input.trialDays ? addInterval(now, "day", input.trialDays) : null

    const subscription = await this.subscriptionsRepo.create({
      userId: input.userId,
      planId: input.planId,
      status: input.trialDays ? "trialing" : "active",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt || periodEnd,
      trialEndsAt,
      metadata: input.metadata ?? null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    })

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

      await this.usageRepo.createMany(usageRecordsToInsert)
    }

    return subscription
  }

  async cancelSubscription(
    subscriptionId: string,
    options: { cancelAtPeriodEnd?: boolean } = {}
  ): Promise<UserSubscription> {
    const subscription = await this.subscriptionsRepo.findById(subscriptionId)
    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
    }

    if (subscription.status === "canceled") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Subscription already canceled",
      })
    }

    const updated = await this.subscriptionsRepo.cancel(subscriptionId, {
      cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? true,
    })

    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    return updated
  }

  async resumeSubscription(subscriptionId: string): Promise<UserSubscription> {
    const subscription = await this.subscriptionsRepo.findById(subscriptionId)
    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Subscription is not pending cancellation",
      })
    }

    const updated = await this.subscriptionsRepo.resume(subscriptionId)
    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    return updated
  }

  async changePlan(subscriptionId: string, newPlanId: string): Promise<UserSubscription> {
    const subscription = await this.subscriptionsRepo.findById(subscriptionId)
    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
    }

    const newPlan = await this.plansRepo.findActive(newPlanId)
    if (!newPlan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "New plan not found or inactive",
      })
    }

    const now = new Date()
    const periodEnd = addInterval(now, newPlan.interval)

    const updated = await this.subscriptionsRepo.changePlan(subscriptionId, newPlanId, periodEnd)
    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    await this.usageRepo.deleteBySubscriptionId(subscriptionId)

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

      await this.usageRepo.createMany(usageRecordsToInsert)
    }

    return updated
  }

  async getSubscription(subscriptionId: string): Promise<UserSubscription> {
    const subscription = await this.subscriptionsRepo.findById(subscriptionId)
    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
    }

    return subscription
  }

  async getCurrentSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
    const subscription = await this.subscriptionsRepo.findByUserId(userId)
    if (!subscription) {
      return null
    }

    const plan = await this.plansRepo.findById(subscription.planId)

    return {
      ...subscription,
      plan,
    }
  }

  async listSubscriptions(options?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<UserSubscription[]> {
    return this.subscriptionsRepo.findAll(options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Usage
  // ─────────────────────────────────────────────────────────────────────────────

  async checkLimit(userId: string, feature: string, increment: number = 1): Promise<UsageLimitCheck> {
    const subscription = await this.subscriptionsRepo.findActiveByUserId(userId)
    if (!subscription) {
      return {
        allowed: false,
        reason: "no_subscription",
        used: 0,
        limit: 0,
        remaining: 0,
      }
    }

    const result = await this.usageRepo.checkLimit(subscription.id, feature, increment)

    return {
      ...result,
      reason: result.reason === "not_found" ? "unlimited" : result.reason,
    }
  }

  async recordUsage(
    userId: string,
    feature: string,
    quantity: number = 1,
    subscriptionId?: string
  ): Promise<UsageRecord> {
    let targetSubscriptionId = subscriptionId

    if (!targetSubscriptionId) {
      const subscription = await this.subscriptionsRepo.findActiveByUserId(userId)
      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found",
        })
      }
      targetSubscriptionId = subscription.id
    }

    const usage = await this.usageRepo.findByFeature(targetSubscriptionId, feature)
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

    const updated = await this.usageRepo.incrementUsage(targetSubscriptionId, feature, quantity)
    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    return updated
  }

  async getUsage(userId: string, feature?: string): Promise<UsageRecord[]> {
    const subscription = await this.subscriptionsRepo.findActiveByUserId(userId)
    if (!subscription) {
      return []
    }

    if (feature) {
      const usage = await this.usageRepo.findByFeature(subscription.id, feature)
      return usage ? [usage] : []
    }

    return this.usageRepo.findBySubscriptionId(subscription.id)
  }

  async resetUsage(userId: string, feature: string): Promise<UsageRecord> {
    const subscription = await this.subscriptionsRepo.findActiveByUserId(userId)
    if (!subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      })
    }

    const updated = await this.usageRepo.resetUsage(subscription.id, feature)
    if (!updated) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Usage record not found",
      })
    }

    return updated
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Period Management
  // ─────────────────────────────────────────────────────────────────────────────

  async renewSubscriptionPeriod(subscriptionId: string): Promise<UserSubscription> {
    const subscription = await this.subscriptionsRepo.findById(subscriptionId)
    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" })
    }

    const plan = await this.plansRepo.findById(subscription.planId)
    if (!plan) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" })
    }

    const now = new Date()
    const periodEnd = addInterval(now, plan.interval)

    const updated = await this.subscriptionsRepo.renewPeriod(subscriptionId, now, periodEnd)
    if (!updated) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
    }

    await this.usageRepo.updatePeriod(subscriptionId, now, periodEnd)

    return updated
  }
}
