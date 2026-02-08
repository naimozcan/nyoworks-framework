// ═══════════════════════════════════════════════════════════════════════════════
// Notification Templates Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, desc } from "drizzle-orm"
import { notificationTemplates } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NotificationTemplate = typeof notificationTemplates.$inferSelect
type NewNotificationTemplate = typeof notificationTemplates.$inferInsert
type NotificationChannel = NotificationTemplate["channel"]

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TemplatesRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewNotificationTemplate, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<NotificationTemplate> {
    const db = this.db as any
    const [result] = await db
      .insert(notificationTemplates)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async findBySlug(slug: string, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.tenantId, this.tenantId),
          eq(notificationTemplates.slug, slug),
          eq(notificationTemplates.channel, channel)
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  async list(): Promise<NotificationTemplate[]> {
    const db = this.db as any
    return db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.tenantId, this.tenantId))
      .orderBy(desc(notificationTemplates.createdAt))
  }

  async listByChannel(channel: NotificationChannel): Promise<NotificationTemplate[]> {
    const db = this.db as any
    return db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.tenantId, this.tenantId),
          eq(notificationTemplates.channel, channel)
        )
      )
      .orderBy(desc(notificationTemplates.createdAt))
  }

  async update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
    const db = this.db as any
    const [result] = await db
      .update(notificationTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }
}
