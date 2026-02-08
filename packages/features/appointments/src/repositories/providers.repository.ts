// ═══════════════════════════════════════════════════════════════════════════════
// Providers Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
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
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewProvider, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Provider> {
    const [result] = await this.db
      .insert(providers)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<Provider | null> {
    const result = await this.db
      .select()
      .from(providers)
      .where(and(eq(providers.id, id), eq(providers.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Provider, "id" | "tenantId" | "createdAt">>): Promise<Provider | null> {
    const [result] = await this.db
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
    const result = await this.db
      .delete(providers)
      .where(and(eq(providers.id, id), eq(providers.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: ProviderListOptions): Promise<ProviderListResult> {
    const { limit, offset } = options

    const conditions = [eq(providers.tenantId, this.tenantId)]

    if (options.isActive !== undefined) {
      conditions.push(eq(providers.isActive, options.isActive))
    }

    const items = await this.db
      .select()
      .from(providers)
      .where(and(...conditions))
      .orderBy(asc(providers.name))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async addService(providerId: string, serviceId: string): Promise<void> {
    await this.db.insert(providerServices).values({
      providerId,
      serviceId,
    })
  }

  async addServices(providerId: string, serviceIds: string[]): Promise<void> {
    if (serviceIds.length === 0) return

    await this.db.insert(providerServices).values(
      serviceIds.map((serviceId) => ({
        providerId,
        serviceId,
      }))
    )
  }

  async removeService(providerId: string, serviceId: string): Promise<void> {
    await this.db
      .delete(providerServices)
      .where(and(eq(providerServices.providerId, providerId), eq(providerServices.serviceId, serviceId)))
  }

  async getServices(providerId: string): Promise<unknown[]> {
    const result = await this.db
      .select({ service: services })
      .from(providerServices)
      .innerJoin(services, eq(providerServices.serviceId, services.id))
      .where(eq(providerServices.providerId, providerId))

    return result.map((r: { service: unknown }) => r.service)
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(providers)
      .where(eq(providers.tenantId, this.tenantId))

    return Number(result[0]?.count ?? 0)
  }
}
