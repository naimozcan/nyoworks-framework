// ═══════════════════════════════════════════════════════════════════════════════
// Base Repository Pattern
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, sql } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Base Repository
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BaseRepository<TInsert, TSelect> {
  constructor(
    protected readonly db: unknown,
    protected readonly table: unknown,
    protected readonly tenantId?: string
  ) {}

  async findById(id: string): Promise<TSelect | null> {
    const result = await (this.db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<TSelect[]> {
    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    return (this.db as any)
      .select()
      .from(this.table)
      .limit(limit)
      .offset(offset)
  }

  async create(data: Omit<TInsert, "id" | "createdAt" | "updatedAt">): Promise<TSelect> {
    const [result] = await (this.db as any)
      .insert(this.table)
      .values(data)
      .returning()

    return result
  }

  async update(
    id: string,
    data: Partial<Omit<TInsert, "id" | "createdAt">>
  ): Promise<TSelect | null> {
    const [result] = await (this.db as any)
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq((this.table as any).id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await (this.db as any)
      .delete(this.table)
      .where(eq((this.table as any).id, id))
      .returning()

    return result.length > 0
  }

  async count(): Promise<number> {
    const result = await (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(this.table)

    return result[0]?.count ?? 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-Scoped Repository
// ─────────────────────────────────────────────────────────────────────────────

export abstract class TenantRepository<TInsert, TSelect> extends BaseRepository<TInsert, TSelect> {
  constructor(
    db: unknown,
    table: unknown,
    protected readonly tenantIdValue: string
  ) {
    super(db, table, tenantIdValue)
  }

  override async findById(id: string): Promise<TSelect | null> {
    const result = await (this.db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).id, id),
          eq((this.table as any).tenantId, this.tenantIdValue)
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  override async findAll(options?: { limit?: number; offset?: number }): Promise<TSelect[]> {
    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    return (this.db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).tenantId, this.tenantIdValue))
      .limit(limit)
      .offset(offset)
  }

  async createWithTenant(
    data: Omit<TInsert, "id" | "createdAt" | "updatedAt" | "tenantId">
  ): Promise<TSelect> {
    const [result] = await (this.db as any)
      .insert(this.table)
      .values({ ...data, tenantId: this.tenantIdValue })
      .returning()

    return result
  }

  async updateWithTenant(
    id: string,
    data: Partial<Omit<TInsert, "id" | "createdAt" | "tenantId">>
  ): Promise<TSelect | null> {
    const [result] = await (this.db as any)
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq((this.table as any).id, id),
          eq((this.table as any).tenantId, this.tenantIdValue)
        )
      )
      .returning()

    return result ?? null
  }

  override async delete(id: string): Promise<boolean> {
    const result = await (this.db as any)
      .delete(this.table)
      .where(
        and(
          eq((this.table as any).id, id),
          eq((this.table as any).tenantId, this.tenantIdValue)
        )
      )
      .returning()

    return result.length > 0
  }

  override async count(): Promise<number> {
    const result = await (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(this.table)
      .where(eq((this.table as any).tenantId, this.tenantIdValue))

    return result[0]?.count ?? 0
  }
}
