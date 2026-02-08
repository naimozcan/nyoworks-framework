// ═══════════════════════════════════════════════════════════════════════════════
// Channels Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, desc, sql } from "drizzle-orm"
import { channels, type Channel, type NewChannel } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ListOptions {
  limit: number
  offset: number
  type?: string
}

interface ListResult {
  items: Channel[]
  total: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class ChannelsRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewChannel, "id" | "createdAt" | "tenantId">): Promise<Channel> {
    const db = this.db as any

    const [result] = await db
      .insert(channels)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Channel | null> {
    const db = this.db as any

    const result = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByName(name: string): Promise<Channel | null> {
    const db = this.db as any

    const result = await db
      .select()
      .from(channels)
      .where(and(eq(channels.name, name), eq(channels.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: ListOptions): Promise<ListResult> {
    const { limit, offset, type } = options
    const db = this.db as any

    const conditions = [eq(channels.tenantId, this.tenantId)]

    if (type) {
      conditions.push(eq(channels.type, type))
    }

    const items = await db
      .select()
      .from(channels)
      .where(and(...conditions))
      .orderBy(desc(channels.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(channels)
      .where(and(...conditions))

    return {
      items,
      total: countResult[0]?.count ?? 0,
    }
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any

    const result = await db
      .delete(channels)
      .where(and(eq(channels.id, id), eq(channels.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async update(id: string, data: Partial<Omit<NewChannel, "id" | "tenantId">>): Promise<Channel | null> {
    const db = this.db as any

    const [result] = await db
      .update(channels)
      .set(data)
      .where(and(eq(channels.id, id), eq(channels.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { ChannelsRepository }
export type { ListOptions, ListResult }
