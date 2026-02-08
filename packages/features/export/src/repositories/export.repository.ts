// ═══════════════════════════════════════════════════════════════════════════════
// Export Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, desc, sql } from "drizzle-orm"
import { exportJobs, type ExportJob, type NewExportJob } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ListOptions {
  limit: number
  offset: number
  type?: string
  status?: string
}

export interface ListResult {
  items: ExportJob[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ExportRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewExportJob, "id" | "createdAt" | "tenantId">): Promise<ExportJob> {
    const [result] = await this.db
      .insert(exportJobs)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<ExportJob | null> {
    const result = await this.db
      .select()
      .from(exportJobs)
      .where(and(eq(exportJobs.id, id), eq(exportJobs.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: ListOptions): Promise<ListResult> {
    const { limit, offset } = options

    const conditions = [eq(exportJobs.tenantId, this.tenantId)]

    if (options.type) {
      conditions.push(eq(exportJobs.type, options.type))
    }

    if (options.status) {
      conditions.push(eq(exportJobs.status, options.status))
    }

    const items = await this.db
      .select()
      .from(exportJobs)
      .where(and(...conditions))
      .orderBy(desc(exportJobs.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(exportJobs)
      .where(eq(exportJobs.tenantId, this.tenantId))

    const total = Number(countResult[0]?.count ?? 0)

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async findByUser(userId: string, options?: { limit?: number; offset?: number }): Promise<ExportJob[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    return this.db
      .select()
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.tenantId, this.tenantId),
          eq(exportJobs.userId, userId)
        )
      )
      .orderBy(desc(exportJobs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async update(id: string, data: Partial<Pick<ExportJob, "status" | "fileUrl" | "errorMessage" | "startedAt" | "completedAt">>): Promise<ExportJob | null> {
    const [result] = await this.db
      .update(exportJobs)
      .set(data)
      .where(and(eq(exportJobs.id, id), eq(exportJobs.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(exportJobs)
      .where(and(eq(exportJobs.id, id), eq(exportJobs.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async countByStatus(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        status: exportJobs.status,
        count: sql<number>`count(*)`,
      })
      .from(exportJobs)
      .where(eq(exportJobs.tenantId, this.tenantId))
      .groupBy(exportJobs.status)

    return Object.fromEntries(result.map((row: { status: string; count: number }) => [row.status, Number(row.count)]))
  }
}
