// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, desc } from "drizzle-orm"
import { userSubscriptions, type UserSubscription, type NewUserSubscription } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SubscriptionsRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewUserSubscription, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<UserSubscription> {
    const db = this.db as any
    const [result] = await db
      .insert(userSubscriptions)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<UserSubscription | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.id, id),
        eq(userSubscriptions.tenantId, this.tenantId)
      ))
      .limit(1)

    return result[0] ?? null
  }

  async findByUserId(userId: string): Promise<UserSubscription | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.tenantId, this.tenantId),
        eq(userSubscriptions.userId, userId)
      ))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1)

    return result[0] ?? null
  }

  async findActiveByUserId(userId: string): Promise<UserSubscription | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.tenantId, this.tenantId),
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "active")
      ))
      .limit(1)

    return result[0] ?? null
  }

  async findAll(options?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<UserSubscription[]> {
    const db = this.db as any
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    let query = db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.tenantId, this.tenantId))

    if (options?.status) {
      query = query.where(eq(userSubscriptions.status, options.status))
    }

    return query
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async update(id: string, data: Partial<UserSubscription>): Promise<UserSubscription | null> {
    const db = this.db as any
    const [result] = await db
      .update(userSubscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSubscriptions.id, id),
        eq(userSubscriptions.tenantId, this.tenantId)
      ))
      .returning()

    return result ?? null
  }

  async cancel(id: string, options: { cancelAtPeriodEnd: boolean }): Promise<UserSubscription | null> {
    const subscription = await this.findById(id)
    if (!subscription) {
      return null
    }

    return this.update(id, {
      status: options.cancelAtPeriodEnd ? subscription.status : "canceled",
      cancelAtPeriodEnd: options.cancelAtPeriodEnd,
      canceledAt: options.cancelAtPeriodEnd ? null : new Date(),
    })
  }

  async resume(id: string): Promise<UserSubscription | null> {
    return this.update(id, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    })
  }

  async changePlan(
    id: string,
    newPlanId: string,
    periodEnd: Date
  ): Promise<UserSubscription | null> {
    const now = new Date()
    return this.update(id, {
      planId: newPlanId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    })
  }

  async renewPeriod(id: string, periodStart: Date, periodEnd: Date): Promise<UserSubscription | null> {
    return this.update(id, {
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      status: "active",
    })
  }
}
