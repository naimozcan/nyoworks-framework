// ═══════════════════════════════════════════════════════════════════════════════
// Subscriptions Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, desc } from "drizzle-orm"
import { subscriptions, type Subscription, type NewSubscription } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SubscriptionsRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewSubscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription> {
    const [result] = await this.db
      .insert(subscriptions)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Subscription | null> {
    const result = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const result = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)

    return result[0] ?? null
  }

  async findByCustomerId(customerId: string): Promise<Subscription[]> {
    return this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerId))
      .orderBy(desc(subscriptions.createdAt))
  }

  async findActiveByCustomerId(customerId: string): Promise<Subscription | null> {
    const result = await this.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.customerId, customerId), eq(subscriptions.status, "active")))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription | null> {
    const [result] = await this.db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning()

    return result ?? null
  }

  async updateByStripeId(stripeSubscriptionId: string, data: Partial<Subscription>): Promise<Subscription | null> {
    const [result] = await this.db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(subscriptions)
      .where(eq(subscriptions.id, id))
      .returning()

    return result.length > 0
  }
}
