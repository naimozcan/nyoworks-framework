// ═══════════════════════════════════════════════════════════════════════════════
// Deals Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, desc, asc, sql } from "drizzle-orm"
import { deals, type Deal, type NewDeal } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DealListOptions {
  contactId?: string
  stage?: string
  limit: number
  offset: number
  sortBy?: "createdAt" | "value" | "expectedCloseDate"
  sortOrder?: "asc" | "desc"
}

export interface DealListResult {
  items: Deal[]
}

export interface PipelineStage {
  count: number
  totalValue: number
}

export type Pipeline = Record<string, PipelineStage>

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class DealsRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewDeal, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Deal> {
    const db = this.db as any
    const [result] = await db
      .insert(deals)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Deal | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Deal, "id" | "tenantId" | "createdAt">>): Promise<Deal | null> {
    const db = this.db as any
    const [result] = await db
      .update(deals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: DealListOptions): Promise<DealListResult> {
    const db = this.db as any
    const { limit, offset, sortBy = "createdAt", sortOrder = "desc" } = options

    let query = db
      .select()
      .from(deals)
      .where(eq(deals.tenantId, this.tenantId))

    if (options.contactId) {
      query = query.where(eq(deals.contactId, options.contactId))
    }

    if (options.stage) {
      query = query.where(eq(deals.stage, options.stage))
    }

    const sortColumns = {
      createdAt: deals.createdAt,
      value: deals.value,
      expectedCloseDate: deals.expectedCloseDate,
    } as const
    const orderFn = sortOrder === "asc" ? asc : desc
    const sortColumn = sortColumns[sortBy] ?? deals.createdAt
    query = query.orderBy(orderFn(sortColumn))

    const items = await query.limit(limit).offset(offset)

    return { items }
  }

  async getPipeline(): Promise<Pipeline> {
    const db = this.db as any
    const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]
    const pipeline: Pipeline = {}

    for (const stage of stages) {
      const result = await db
        .select({
          count: sql<number>`count(*)`,
          totalValue: sql<number>`coalesce(sum(value), 0)`,
        })
        .from(deals)
        .where(and(eq(deals.tenantId, this.tenantId), eq(deals.stage, stage)))

      pipeline[stage] = {
        count: result[0]?.count ?? 0,
        totalValue: result[0]?.totalValue ?? 0,
      }
    }

    return pipeline
  }

  async count(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(eq(deals.tenantId, this.tenantId))

    return result[0]?.count ?? 0
  }

  async getTotalValue(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ total: sql<number>`coalesce(sum(value), 0)` })
      .from(deals)
      .where(eq(deals.tenantId, this.tenantId))

    return result[0]?.total ?? 0
  }
}
