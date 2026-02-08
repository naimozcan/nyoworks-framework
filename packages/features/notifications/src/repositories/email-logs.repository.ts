// ═══════════════════════════════════════════════════════════════════════════════
// Email Logs Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, desc } from "drizzle-orm"
import { emailLogs } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EmailLog = typeof emailLogs.$inferSelect
type NewEmailLog = typeof emailLogs.$inferInsert

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class EmailLogsRepository {
  constructor(private readonly db: unknown) {}

  async create(data: Omit<NewEmailLog, "id" | "createdAt">): Promise<EmailLog> {
    const db = this.db as any
    const [result] = await db
      .insert(emailLogs)
      .values(data)
      .returning()

    return result
  }

  async findByNotificationId(notificationId: string): Promise<EmailLog[]> {
    const db = this.db as any
    return db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.notificationId, notificationId))
      .orderBy(desc(emailLogs.createdAt))
  }

  async update(id: string, data: Partial<EmailLog>): Promise<EmailLog | null> {
    const db = this.db as any
    const [result] = await db
      .update(emailLogs)
      .set(data)
      .where(eq(emailLogs.id, id))
      .returning()

    return result ?? null
  }

  async markOpened(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .update(emailLogs)
      .set({ openedAt: new Date() })
      .where(eq(emailLogs.id, id))
      .returning()

    return result.length > 0
  }

  async markClicked(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .update(emailLogs)
      .set({ clickedAt: new Date() })
      .where(eq(emailLogs.id, id))
      .returning()

    return result.length > 0
  }
}
