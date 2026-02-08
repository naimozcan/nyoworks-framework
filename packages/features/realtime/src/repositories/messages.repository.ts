// ═══════════════════════════════════════════════════════════════════════════════
// Messages Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, desc } from "drizzle-orm"
import { messages, type Message, type NewMessage } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ListOptions {
  limit?: number
  offset?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class MessagesRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewMessage, "id" | "createdAt">): Promise<Message> {
    const [result] = await this.db
      .insert(messages)
      .values(data)
      .returning()

    return result!
  }

  async findByChannel(channelId: string, options?: ListOptions): Promise<Message[]> {
    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    return this.db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findById(id: string): Promise<Message | null> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async deleteByChannel(channelId: string): Promise<number> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.channelId, channelId))
      .returning()

    return result.length
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { MessagesRepository }
export type { ListOptions }
