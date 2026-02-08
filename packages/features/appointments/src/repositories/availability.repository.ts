// ═══════════════════════════════════════════════════════════════════════════════
// Availability Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, asc } from "drizzle-orm"
import { availability, type Availability, type NewAvailability } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailabilityListResult {
  items: Availability[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class AvailabilityRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewAvailability, "id" | "createdAt" | "updatedAt">): Promise<Availability> {
    const [result] = await this.db
      .insert(availability)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Availability | null> {
    const result = await this.db
      .select()
      .from(availability)
      .where(eq(availability.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByProviderAndDay(providerId: string, dayOfWeek: number): Promise<Availability | null> {
    const result = await this.db
      .select()
      .from(availability)
      .where(and(eq(availability.providerId, providerId), eq(availability.dayOfWeek, dayOfWeek)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Availability, "id" | "providerId" | "createdAt">>): Promise<Availability | null> {
    const [result] = await this.db
      .update(availability)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(availability.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(availability)
      .where(eq(availability.id, id))
      .returning()

    return result.length > 0
  }

  async listByProvider(providerId: string): Promise<AvailabilityListResult> {
    const items = await this.db
      .select()
      .from(availability)
      .where(eq(availability.providerId, providerId))
      .orderBy(asc(availability.dayOfWeek))

    return { items }
  }

  async getActiveByProviderAndDay(providerId: string, dayOfWeek: number): Promise<Availability | null> {
    const result = await this.db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.providerId, providerId),
          eq(availability.dayOfWeek, dayOfWeek),
          eq(availability.isAvailable, true)
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  async getActiveByProvider(providerId: string): Promise<Availability[]> {
    return this.db
      .select()
      .from(availability)
      .where(and(eq(availability.providerId, providerId), eq(availability.isAvailable, true)))
  }
}
