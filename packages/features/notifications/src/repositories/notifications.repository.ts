// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, desc, sql } from "drizzle-orm"
import { notifications } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Notification = typeof notifications.$inferSelect
type NewNotification = typeof notifications.$inferInsert
type NotificationChannel = Notification["channel"]
type NotificationStatus = Notification["status"]

interface ListOptions {
  limit: number
  offset: number
  userId?: string
  channel?: NotificationChannel
  status?: NotificationStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class NotificationsRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewNotification, "id" | "createdAt" | "tenantId">): Promise<Notification> {
    const [result] = await this.db
      .insert(notifications)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: ListOptions): Promise<Notification[]> {
    const { limit, offset } = options
    const conditions = [eq(notifications.tenantId, this.tenantId)]

    if (options.userId) {
      conditions.push(eq(notifications.userId, options.userId))
    }

    if (options.channel) {
      conditions.push(eq(notifications.channel, options.channel))
    }

    if (options.status) {
      conditions.push(eq(notifications.status, options.status))
    }

    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async listByUser(userId: string, options: { limit: number; offset: number; channel?: NotificationChannel; status?: NotificationStatus }): Promise<Notification[]> {
    const { limit, offset } = options
    const conditions = [eq(notifications.userId, userId)]

    if (options.channel) {
      conditions.push(eq(notifications.channel, options.channel))
    }

    if (options.status) {
      conditions.push(eq(notifications.status, options.status))
    }

    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification | null> {
    const [result] = await this.db
      .update(notifications)
      .set(data)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .update(notifications)
      .set({
        status: "read",
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning()

    return result.length > 0
  }

  async markAllAsRead(userId: string, channel?: NotificationChannel): Promise<number> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.status, "delivered")
    ]

    if (channel) {
      conditions.push(eq(notifications.channel, channel))
    }

    const result = await this.db
      .update(notifications)
      .set({
        status: "read",
        readAt: new Date(),
      })
      .where(and(...conditions))
      .returning()

    return result.length
  }

  async countUnread(userId: string, channel?: NotificationChannel): Promise<number> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.status, "delivered")
    ]

    if (channel) {
      conditions.push(eq(notifications.channel, channel))
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions))

    return Number(result[0]?.count ?? 0)
  }
}
