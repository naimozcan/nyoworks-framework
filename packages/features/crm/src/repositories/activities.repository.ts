// ═══════════════════════════════════════════════════════════════════════════════
// Activities Repository
// ═══════════════════════════════════════════════════════════════════════════════

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
  constructor(private readonly db: unknown) {}

  async create(data: Omit<NewActivity, "id" | "createdAt">): Promise<Activity> {
    const db = this.db as any
    const [result] = await db
      .insert(activities)
      .values(data)
      .returning()

    return result
  }

  async findById(id: string): Promise<Activity | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Activity, "id" | "contactId" | "userId" | "createdAt">>): Promise<Activity | null> {
    const db = this.db as any
    const [result] = await db
      .update(activities)
      .set(data)
      .where(eq(activities.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(activities)
      .where(eq(activities.id, id))
      .returning()

    return result.length > 0
  }

  async list(options: ActivityListOptions): Promise<ActivityListResult> {
    const db = this.db as any
    const { limit, offset } = options

    let query = db.select().from(activities)

    if (options.contactId) {
      query = query.where(eq(activities.contactId, options.contactId))
    }

    if (options.type) {
      query = query.where(eq(activities.type, options.type))
    }

    const items = await query
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async countByContact(contactId: string): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(eq(activities.contactId, contactId))

    return result[0]?.count ?? 0
  }
}
