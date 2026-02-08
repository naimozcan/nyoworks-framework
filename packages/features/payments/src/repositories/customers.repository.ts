// ═══════════════════════════════════════════════════════════════════════════════
// Customers Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and } from "drizzle-orm"
import { customers, type Customer, type NewCustomer } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class CustomersRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewCustomer, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Customer> {
    const db = this.db as any
    const [result] = await db
      .insert(customers)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Customer | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(customers)
      .where(and(eq(customers.userId, userId), eq(customers.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Customer | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.stripeCustomerId, stripeCustomerId))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
    const db = this.db as any
    const [result] = await db
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async getOrCreate(userId: string, email: string, stripeCustomerId: string, name?: string): Promise<Customer> {
    const existing = await this.findByUserId(userId)

    if (existing) {
      return existing
    }

    return this.create({
      userId,
      email,
      stripeCustomerId,
      name,
    })
  }
}
