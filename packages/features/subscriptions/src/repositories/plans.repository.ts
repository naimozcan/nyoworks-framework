// ═══════════════════════════════════════════════════════════════════════════════
// Plans Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, asc, sql } from "drizzle-orm"
import { plans, userSubscriptions, type Plan, type NewPlan } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PlansRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewPlan, "id" | "createdAt" | "updatedAt">): Promise<Plan> {
    const [result] = await this.db
      .insert(plans)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Plan | null> {
    const result = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    const result = await this.db
      .select()
      .from(plans)
      .where(eq(plans.slug, slug))
      .limit(1)

    return result[0] ?? null
  }

  async findActive(id: string): Promise<Plan | null> {
    const result = await this.db
      .select()
      .from(plans)
      .where(and(eq(plans.id, id), eq(plans.isActive, true)))
      .limit(1)

    return result[0] ?? null
  }

  async findAll(options?: { activeOnly?: boolean }): Promise<Plan[]> {
    if (options?.activeOnly) {
      return this.db
        .select()
        .from(plans)
        .where(eq(plans.isActive, true))
        .orderBy(asc(plans.sortOrder), asc(plans.name))
    }

    return this.db
      .select()
      .from(plans)
      .orderBy(asc(plans.sortOrder), asc(plans.name))
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan | null> {
    const [result] = await this.db
      .update(plans)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(plans)
      .where(eq(plans.id, id))
      .returning()

    return result.length > 0
  }

  async hasActiveSubscriptions(planId: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.planId, planId),
        eq(userSubscriptions.status, "active")
      ))

    return (result[0]?.count ?? 0) > 0
  }

  async setActive(id: string, isActive: boolean): Promise<Plan | null> {
    return this.update(id, { isActive })
  }

  async reorder(orderings: Array<{ id: string; sortOrder: number }>): Promise<void> {
    for (const { id, sortOrder } of orderings) {
      await this.db
        .update(plans)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(plans.id, id))
    }
  }
}
