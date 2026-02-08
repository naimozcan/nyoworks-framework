// ═══════════════════════════════════════════════════════════════════════════════
// Notification Preferences Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq } from "drizzle-orm"
import { notificationPreferences } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NotificationPreference = typeof notificationPreferences.$inferSelect
type NewNotificationPreference = typeof notificationPreferences.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PreferencesRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const result = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)

    return result[0] ?? null
  }

  async create(data: Omit<NewNotificationPreference, "id" | "createdAt" | "updatedAt">): Promise<NotificationPreference> {
    const [result] = await this.db
      .insert(notificationPreferences)
      .values(data)
      .returning()

    return result!
  }

  async update(userId: string, data: Partial<NotificationPreference>): Promise<NotificationPreference | null> {
    const [result] = await this.db
      .update(notificationPreferences)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning()

    return result ?? null
  }

  async upsert(userId: string, data: Partial<Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<NotificationPreference> {
    const existing = await this.findByUserId(userId)

    if (existing) {
      const updated = await this.update(userId, data)
      return updated!
    }

    return this.create({
      userId,
      ...data,
    })
  }
}
