// ═══════════════════════════════════════════════════════════════════════════════
// Presence Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gt } from "drizzle-orm"
import { presenceRecords, type PresenceRecord, type NewPresenceRecord } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UpdatePresenceData {
  status?: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class PresenceRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewPresenceRecord, "id" | "connectedAt" | "lastSeenAt">): Promise<PresenceRecord> {
    const [result] = await this.db
      .insert(presenceRecords)
      .values(data)
      .returning()

    return result!
  }

  async findByChannelAndUser(channelId: string, userId: string): Promise<PresenceRecord | null> {
    const result = await this.db
      .select()
      .from(presenceRecords)
      .where(and(eq(presenceRecords.channelId, channelId), eq(presenceRecords.userId, userId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByChannel(channelId: string, staleThreshold?: Date): Promise<PresenceRecord[]> {
    const conditions = [eq(presenceRecords.channelId, channelId)]

    if (staleThreshold) {
      conditions.push(gt(presenceRecords.lastSeenAt, staleThreshold))
    }

    return this.db
      .select()
      .from(presenceRecords)
      .where(and(...conditions))
  }

  async update(channelId: string, userId: string, data: UpdatePresenceData): Promise<PresenceRecord | null> {
    const [result] = await this.db
      .update(presenceRecords)
      .set({
        ...data,
        lastSeenAt: new Date(),
      })
      .where(and(eq(presenceRecords.channelId, channelId), eq(presenceRecords.userId, userId)))
      .returning()

    return result ?? null
  }

  async updateById(id: string, data: UpdatePresenceData): Promise<PresenceRecord | null> {
    const [result] = await this.db
      .update(presenceRecords)
      .set({
        ...data,
        lastSeenAt: new Date(),
      })
      .where(eq(presenceRecords.id, id))
      .returning()

    return result ?? null
  }

  async delete(channelId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(presenceRecords)
      .where(and(eq(presenceRecords.channelId, channelId), eq(presenceRecords.userId, userId)))
      .returning()

    return result.length > 0
  }

  async heartbeat(channelId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .update(presenceRecords)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(presenceRecords.channelId, channelId), eq(presenceRecords.userId, userId)))
      .returning()

    return result.length > 0
  }

  async upsert(
    channelId: string,
    userId: string,
    data: { status: string; metadata?: Record<string, unknown> }
  ): Promise<PresenceRecord> {
    const existing = await this.findByChannelAndUser(channelId, userId)

    if (existing) {
      const updated = await this.updateById(existing.id, data)
      return updated!
    }

    return this.create({
      channelId,
      userId,
      status: data.status,
      metadata: data.metadata,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { PresenceRepository }
export type { UpdatePresenceData }
