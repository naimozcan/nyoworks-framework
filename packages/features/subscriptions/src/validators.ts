// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Plan Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createPlanInput = z.object({
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  slug: z.string().min(1).max(PAGINATION.MAX_LIMIT).regex(/^[a-z0-9-]+$/),
  description: z.string().max(PAGINATION.MAX_LIMIT * 10).optional(),
  features: z.array(z.string()).default([]),
  limits: z.record(z.string(), z.number().min(0)).default({}),
  price: z.number().min(0),
  interval: z.enum(["day", "week", "month", "year"]).default("month"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updatePlanInput = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  slug: z.string().min(1).max(PAGINATION.MAX_LIMIT).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(PAGINATION.MAX_LIMIT * 10).optional(),
  features: z.array(z.string()).optional(),
  limits: z.record(z.string(), z.number().min(0)).optional(),
  price: z.number().min(0).optional(),
  interval: z.enum(["day", "week", "month", "year"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const getPlanInput = z.object({
  planId: z.string().uuid(),
})

export const deletePlanInput = z.object({
  planId: z.string().uuid(),
})

export const listPlansInput = z.object({
  activeOnly: z.boolean().default(true),
})

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Validators
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionStatus = z.enum([
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "trialing",
  "paused",
  "incomplete",
])

export const subscribeInput = z.object({
  planId: z.string().uuid(),
  trialDays: z.number().int().min(0).max(90).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const cancelSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().max(500).optional(),
})

export const resumeSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
})

export const changePlanInput = z.object({
  subscriptionId: z.string().uuid(),
  newPlanId: z.string().uuid(),
  prorated: z.boolean().default(true),
})

export const getSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
})

export const listSubscriptionsInput = z.object({
  status: subscriptionStatus.optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Usage Validators
// ─────────────────────────────────────────────────────────────────────────────

export const checkLimitInput = z.object({
  feature: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  increment: z.number().int().min(1).default(1),
})

export const recordUsageInput = z.object({
  feature: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  quantity: z.number().int().min(1).default(1),
  subscriptionId: z.string().uuid().optional(),
})

export const getUsageInput = z.object({
  feature: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  subscriptionId: z.string().uuid().optional(),
})

export const resetUsageInput = z.object({
  feature: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  subscriptionId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type CreatePlanInput = z.infer<typeof createPlanInput>
export type UpdatePlanInput = z.infer<typeof updatePlanInput>
export type GetPlanInput = z.infer<typeof getPlanInput>
export type DeletePlanInput = z.infer<typeof deletePlanInput>
export type ListPlansInput = z.infer<typeof listPlansInput>

export type SubscriptionStatus = z.infer<typeof subscriptionStatus>
export type SubscribeInput = z.infer<typeof subscribeInput>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionInput>
export type ResumeSubscriptionInput = z.infer<typeof resumeSubscriptionInput>
export type ChangePlanInput = z.infer<typeof changePlanInput>
export type GetSubscriptionInput = z.infer<typeof getSubscriptionInput>
export type ListSubscriptionsInput = z.infer<typeof listSubscriptionsInput>

export type CheckLimitInput = z.infer<typeof checkLimitInput>
export type RecordUsageInput = z.infer<typeof recordUsageInput>
export type GetUsageInput = z.infer<typeof getUsageInput>
export type ResetUsageInput = z.infer<typeof resetUsageInput>
