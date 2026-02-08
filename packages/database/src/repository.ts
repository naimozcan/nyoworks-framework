// ═══════════════════════════════════════════════════════════════════════════════
// Base Repository Pattern - Type-Safe Implementation
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "./client"
import type { PgTable, TableConfig } from "drizzle-orm/pg-core"
import { eq, and, sql, desc, asc, type SQL } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListOptions {
  limit: number
  offset: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface ListResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Repository
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BaseRepository<
  TTable extends PgTable<TableConfig>,
  TInsert = TTable["$inferInsert"],
  TSelect = TTable["$inferSelect"]
> {
  constructor(
    protected readonly db: DrizzleDatabase,
    protected readonly table: TTable
  ) {}

  protected getIdColumn() {
    return (this.table as unknown as { id: any }).id
  }

  async findById(id: string): Promise<TSelect | null> {
    const results = await this.db
      .select()
      .from(this.table as any)
      .where(eq(this.getIdColumn(), id))
      .limit(1)

    return (results[0] as TSelect) ?? null
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<TSelect[]> {
    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    const results = await this.db
      .select()
      .from(this.table as any)
      .limit(limit)
      .offset(offset)

    return results as TSelect[]
  }

  async create(data: Omit<TInsert, "id" | "createdAt" | "updatedAt">): Promise<TSelect> {
    const results = await this.db
      .insert(this.table as any)
      .values(data as any)
      .returning()

    return results[0] as TSelect
  }

  async update(
    id: string,
    data: Partial<Omit<TInsert, "id" | "createdAt">>
  ): Promise<TSelect | null> {
    const results = await this.db
      .update(this.table as any)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(this.getIdColumn(), id))
      .returning()

    return (results[0] as TSelect) ?? null
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(this.table as any)
      .where(eq(this.getIdColumn(), id))
      .returning()

    return results.length > 0
  }

  async count(conditions?: SQL): Promise<number> {
    const query = this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table as any)

    const results = conditions
      ? await query.where(conditions)
      : await query

    return Number(results[0]?.count ?? 0)
  }

  protected orderBy(column: any, order: "asc" | "desc" = "desc") {
    return order === "asc" ? asc(column) : desc(column)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-Scoped Repository
// ─────────────────────────────────────────────────────────────────────────────

export abstract class TenantRepository<
  TTable extends PgTable<TableConfig>,
  TInsert = TTable["$inferInsert"],
  TSelect = TTable["$inferSelect"]
> extends BaseRepository<TTable, TInsert, TSelect> {
  constructor(
    db: DrizzleDatabase,
    table: TTable,
    protected readonly tenantId: string
  ) {
    super(db, table)
  }

  protected getTenantIdColumn() {
    return (this.table as unknown as { tenantId: any }).tenantId
  }

  protected tenantCondition(): SQL {
    return eq(this.getTenantIdColumn(), this.tenantId)
  }

  protected withTenant(condition?: SQL): SQL {
    return condition
      ? and(this.tenantCondition(), condition)!
      : this.tenantCondition()
  }

  override async findById(id: string): Promise<TSelect | null> {
    const results = await this.db
      .select()
      .from(this.table as any)
      .where(and(eq(this.getIdColumn(), id), this.tenantCondition()))
      .limit(1)

    return (results[0] as TSelect) ?? null
  }

  override async findAll(options?: { limit?: number; offset?: number }): Promise<TSelect[]> {
    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    const results = await this.db
      .select()
      .from(this.table as any)
      .where(this.tenantCondition())
      .limit(limit)
      .offset(offset)

    return results as TSelect[]
  }

  async list(options: ListOptions): Promise<ListResult<TSelect>> {
    const { limit, offset } = options

    const results = await this.db
      .select()
      .from(this.table as any)
      .where(this.tenantCondition())
      .limit(limit + 1)
      .offset(offset)

    const items = results.slice(0, limit) as TSelect[]
    const hasMore = results.length > limit

    const totalResult = await this.count(this.tenantCondition())

    return {
      items,
      total: totalResult,
      hasMore,
    }
  }

  async createWithTenant(
    data: Omit<TInsert, "id" | "createdAt" | "updatedAt" | "tenantId">
  ): Promise<TSelect> {
    const results = await this.db
      .insert(this.table as any)
      .values({ ...data, tenantId: this.tenantId } as any)
      .returning()

    return results[0] as TSelect
  }

  async updateWithTenant(
    id: string,
    data: Partial<Omit<TInsert, "id" | "createdAt" | "tenantId">>
  ): Promise<TSelect | null> {
    const results = await this.db
      .update(this.table as any)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(this.getIdColumn(), id), this.tenantCondition()))
      .returning()

    return (results[0] as TSelect) ?? null
  }

  override async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(this.table as any)
      .where(and(eq(this.getIdColumn(), id), this.tenantCondition()))
      .returning()

    return results.length > 0
  }

  async countTenant(): Promise<number> {
    return this.count(this.tenantCondition())
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id)
    return result !== null
  }
}
