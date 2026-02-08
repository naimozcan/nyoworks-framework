// ═══════════════════════════════════════════════════════════════════════════════
// Usage Records Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, asc } from "drizzle-orm"
import { usageRecords, type UsageRecord, type NewUsageRecord } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class UsageRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewUsageRecord, "id" | "createdAt" | "updatedAt">): Promise<UsageRecord> {
    const [result] = await this.db
      .insert(usageRecords)
      .values(data)
      .returning()

    return result!
  }

  async createMany(records: Array<Omit<NewUsageRecord, "id" | "createdAt" | "updatedAt">>): Promise<UsageRecord[]> {
    const results = await this.db
      .insert(usageRecords)
      .values(records)
      .returning()

    return results
  }

  async findById(id: string): Promise<UsageRecord | null> {
    const result = await this.db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findBySubscriptionId(subscriptionId: string): Promise<UsageRecord[]> {
    return this.db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.subscriptionId, subscriptionId))
      .orderBy(asc(usageRecords.feature))
  }

  async findByFeature(subscriptionId: string, feature: string): Promise<UsageRecord | null> {
    const result = await this.db
      .select()
      .from(usageRecords)
      .where(and(
        eq(usageRecords.subscriptionId, subscriptionId),
        eq(usageRecords.feature, feature)
      ))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<UsageRecord>): Promise<UsageRecord | null> {
    const [result] = await this.db
      .update(usageRecords)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(usageRecords.id, id))
      .returning()

    return result ?? null
  }

  async incrementUsage(subscriptionId: string, feature: string, quantity: number): Promise<UsageRecord | null> {
    const usage = await this.findByFeature(subscriptionId, feature)

    if (!usage) {
      return null
    }

    const newUsed = usage.used + quantity

    const [result] = await this.db
      .update(usageRecords)
      .set({
        used: newUsed,
        updatedAt: new Date(),
      })
      .where(eq(usageRecords.id, usage.id))
      .returning()

    return result ?? null
  }

  async resetUsage(subscriptionId: string, feature: string): Promise<UsageRecord | null> {
    const [result] = await this.db
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

    return result ?? null
  }

  async resetAllForSubscription(subscriptionId: string): Promise<void> {
    await this.db
      .update(usageRecords)
      .set({
        used: 0,
        updatedAt: new Date(),
      })
      .where(eq(usageRecords.subscriptionId, subscriptionId))
  }

  async deleteBySubscriptionId(subscriptionId: string): Promise<void> {
    await this.db
      .delete(usageRecords)
      .where(eq(usageRecords.subscriptionId, subscriptionId))
  }

  async checkLimit(subscriptionId: string, feature: string, increment: number = 1): Promise<{
    allowed: boolean
    reason: "ok" | "limit_exceeded" | "not_found" | "unlimited"
    used: number
    limit: number
    remaining: number
  }> {
    const usage = await this.findByFeature(subscriptionId, feature)

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
  }

  async updatePeriod(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    await this.db
      .update(usageRecords)
      .set({
        periodStart,
        periodEnd,
        used: 0,
        updatedAt: new Date(),
      })
      .where(eq(usageRecords.subscriptionId, subscriptionId))
  }
}
