// ═══════════════════════════════════════════════════════════════════════════════
// Activities Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, desc, sql } from "drizzle-orm"
import { activities, type Activity, type NewActivity } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityListOptions {
  contactId?: string
  type?: string
  limit: number
  offset: number
}

export interface ActivityListResult {
  items: Activity[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ActivitiesRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewActivity, "id" | "createdAt">): Promise<Activity> {
    const [result] = await this.db
      .insert(activities)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Activity | null> {
    const result = await this.db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Activity, "id" | "contactId" | "userId" | "createdAt">>): Promise<Activity | null> {
    const [result] = await this.db
      .update(activities)
      .set(data)
      .where(eq(activities.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning()

    return result.length > 0
  }

  async list(options: ActivityListOptions): Promise<ActivityListResult> {
    const { limit, offset } = options

    const conditions = []

    if (options.contactId) {
      conditions.push(eq(activities.contactId, options.contactId))
    }

    if (options.type) {
      conditions.push(eq(activities.type, options.type))
    }

    const query = conditions.length > 0
      ? this.db.select().from(activities).where(eq(activities.contactId, options.contactId!))
      : this.db.select().from(activities)

    const items = await query
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async countByContact(contactId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(eq(activities.contactId, contactId))

    return Number(result[0]?.count ?? 0)
  }
}
