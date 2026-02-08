// ═══════════════════════════════════════════════════════════════════════════════
// Services Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, asc, sql } from "drizzle-orm"
import { services, type Service, type NewService } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceListOptions {
  isActive?: boolean
  limit: number
  offset: number
}

export interface ServiceListResult {
  items: Service[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ServicesRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewService, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Service> {
    const [result] = await this.db
      .insert(services)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<Service | null> {
    const result = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Service, "id" | "tenantId" | "createdAt">>): Promise<Service | null> {
    const [result] = await this.db
      .update(services)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(services.id, id), eq(services.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: ServiceListOptions): Promise<ServiceListResult> {
    const { limit, offset } = options

    const conditions = [eq(services.tenantId, this.tenantId)]

    if (options.isActive !== undefined) {
      conditions.push(eq(services.isActive, options.isActive))
    }

    const items = await this.db
      .select()
      .from(services)
      .where(and(...conditions))
      .orderBy(asc(services.name))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.tenantId, this.tenantId))

    return Number(result[0]?.count ?? 0)
  }
}
