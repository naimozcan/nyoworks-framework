// ═══════════════════════════════════════════════════════════════════════════════
// Providers Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, asc, sql } from "drizzle-orm"
import { providers, providerServices, services, type Provider, type NewProvider } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderListOptions {
  isActive?: boolean
  limit: number
  offset: number
}

export interface ProviderListResult {
  items: Provider[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ProvidersRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewProvider, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Provider> {
    const db = this.db as any
    const [result] = await db
      .insert(providers)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Provider | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(providers)
      .where(and(eq(providers.id, id), eq(providers.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Provider, "id" | "tenantId" | "createdAt">>): Promise<Provider | null> {
    const db = this.db as any
    const [result] = await db
      .update(providers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(providers.id, id), eq(providers.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(providers)
      .where(and(eq(providers.id, id), eq(providers.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: ProviderListOptions): Promise<ProviderListResult> {
    const db = this.db as any
    const { limit, offset } = options

    let query = db
      .select()
      .from(providers)
      .where(eq(providers.tenantId, this.tenantId))

    if (options.isActive !== undefined) {
      query = query.where(eq(providers.isActive, options.isActive))
    }

    const items = await query
      .orderBy(asc(providers.name))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async addService(providerId: string, serviceId: string): Promise<void> {
    const db = this.db as any
    await db.insert(providerServices).values({
      providerId,
      serviceId,
    })
  }

  async addServices(providerId: string, serviceIds: string[]): Promise<void> {
    if (serviceIds.length === 0) return

    const db = this.db as any
    await db.insert(providerServices).values(
      serviceIds.map((serviceId) => ({
        providerId,
        serviceId,
      }))
    )
  }

  async removeService(providerId: string, serviceId: string): Promise<void> {
    const db = this.db as any
    await db
      .delete(providerServices)
      .where(and(eq(providerServices.providerId, providerId), eq(providerServices.serviceId, serviceId)))
  }

  async getServices(providerId: string): Promise<unknown[]> {
    const db = this.db as any
    const result = await db
      .select({ service: services })
      .from(providerServices)
      .innerJoin(services, eq(providerServices.serviceId, services.id))
      .where(eq(providerServices.providerId, providerId))

    return result.map((r: { service: unknown }) => r.service)
  }

  async count(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(providers)
      .where(eq(providers.tenantId, this.tenantId))

    return result[0]?.count ?? 0
  }
}
