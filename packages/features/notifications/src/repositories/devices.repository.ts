// ═══════════════════════════════════════════════════════════════════════════════
// Push Devices Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and } from "drizzle-orm"
import { pushDevices } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PushDevice = typeof pushDevices.$inferSelect
type NewPushDevice = typeof pushDevices.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class DevicesRepository {
  constructor(private readonly db: unknown) {}

  async findByToken(deviceToken: string): Promise<PushDevice | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(pushDevices)
      .where(eq(pushDevices.deviceToken, deviceToken))
      .limit(1)

    return result[0] ?? null
  }

  async findByUserId(userId: string, activeOnly: boolean = true): Promise<PushDevice[]> {
    const db = this.db as any
    let query = db
      .select()
      .from(pushDevices)
      .where(eq(pushDevices.userId, userId))

    if (activeOnly) {
      query = query.where(eq(pushDevices.isActive, true))
    }

    return query
  }

  async create(data: Omit<NewPushDevice, "id" | "createdAt">): Promise<PushDevice> {
    const db = this.db as any
    const [result] = await db
      .insert(pushDevices)
      .values(data)
      .returning()

    return result
  }

  async update(deviceToken: string, data: Partial<PushDevice>): Promise<PushDevice | null> {
    const db = this.db as any
    const [result] = await db
      .update(pushDevices)
      .set(data)
      .where(eq(pushDevices.deviceToken, deviceToken))
      .returning()

    return result ?? null
  }

  async deactivate(deviceToken: string, userId: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .update(pushDevices)
      .set({ isActive: false })
      .where(
        and(
          eq(pushDevices.deviceToken, deviceToken),
          eq(pushDevices.userId, userId)
        )
      )
      .returning()

    return result.length > 0
  }

  async registerOrUpdate(userId: string, deviceToken: string, platform: string, deviceName?: string): Promise<PushDevice> {
    const existing = await this.findByToken(deviceToken)

    if (existing) {
      const updated = await this.update(deviceToken, {
        userId,
        platform,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      })
      return updated!
    }

    return this.create({
      userId,
      deviceToken,
      platform,
      deviceName,
    })
  }
}
