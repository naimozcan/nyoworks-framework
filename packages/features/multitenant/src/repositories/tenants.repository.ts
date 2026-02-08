// ═══════════════════════════════════════════════════════════════════════════════
// Tenants Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, sql, asc } from "drizzle-orm"
import { tenants, type Tenant, type NewTenant } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ListOptions {
  limit: number
  offset: number
  status?: string
  tenantIds?: string[]
}

interface ListResult {
  items: Tenant[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class TenantsRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewTenant, "id" | "createdAt" | "updatedAt">): Promise<Tenant> {
    const [result] = await this.db
      .insert(tenants)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Tenant | null> {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)

    return result[0] ?? null
  }

  async findBySlugExcluding(slug: string, excludeId: string): Promise<Tenant | null> {
    const result = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), sql`${tenants.id} != ${excludeId}`))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: ListOptions): Promise<ListResult> {
    const { limit, offset, status, tenantIds } = options

    if (!tenantIds || tenantIds.length === 0) {
      return { items: [], total: 0, hasMore: false }
    }

    const conditions = [sql`${tenants.id} IN ${tenantIds}`]

    if (status) {
      conditions.push(eq(tenants.status, status))
    }

    const items = await this.db
      .select()
      .from(tenants)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(tenants.name))

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(and(...conditions))

    const total = Number(countResult[0]?.count ?? 0)

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async update(id: string, data: Partial<Omit<NewTenant, "id" | "createdAt">>): Promise<Tenant | null> {
    const [result] = await this.db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<Tenant | null> {
    const [result] = await this.db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning()

    return result ?? null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { TenantsRepository }
export type { ListOptions, ListResult }
