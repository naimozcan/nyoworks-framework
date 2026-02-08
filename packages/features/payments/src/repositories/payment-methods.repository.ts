// ═══════════════════════════════════════════════════════════════════════════════
// Payment Methods Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and } from "drizzle-orm"
import { paymentMethods, type PaymentMethod, type NewPaymentMethod } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentMethodsRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewPaymentMethod, "id" | "createdAt">): Promise<PaymentMethod> {
    const [result] = await this.db
      .insert(paymentMethods)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    const result = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByStripePaymentMethodId(stripePaymentMethodId: string): Promise<PaymentMethod | null> {
    const result = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.stripePaymentMethodId, stripePaymentMethodId))
      .limit(1)

    return result[0] ?? null
  }

  async findByCustomerId(customerId: string): Promise<PaymentMethod[]> {
    return this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.customerId, customerId))
  }

  async findDefaultByCustomerId(customerId: string): Promise<PaymentMethod | null> {
    const result = await this.db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.customerId, customerId), eq(paymentMethods.isDefault, true)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
    const [result] = await this.db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id))
      .returning()

    return result ?? null
  }

  async setDefault(id: string, customerId: string): Promise<PaymentMethod | null> {
    await this.db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.customerId, customerId))

    const [result] = await this.db
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(eq(paymentMethods.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning()

    return result.length > 0
  }

  async deleteByStripeId(stripePaymentMethodId: string): Promise<boolean> {
    const result = await this.db
      .delete(paymentMethods)
      .where(eq(paymentMethods.stripePaymentMethodId, stripePaymentMethodId))
      .returning()

    return result.length > 0
  }

  async createFromStripe(
    stripePaymentMethod: {
      id: string
      type: string
      card?: {
        brand: string | null
        last4: string | null
        exp_month: number | null
        exp_year: number | null
      } | null
    },
    customerId: string
  ): Promise<PaymentMethod> {
    const [result] = await this.db
      .insert(paymentMethods)
      .values({
        customerId,
        stripePaymentMethodId: stripePaymentMethod.id,
        type: stripePaymentMethod.type,
        cardBrand: stripePaymentMethod.card?.brand ?? null,
        cardLast4: stripePaymentMethod.card?.last4 ?? null,
        cardExpMonth: stripePaymentMethod.card?.exp_month ?? null,
        cardExpYear: stripePaymentMethod.card?.exp_year ?? null,
        isDefault: false,
      })
      .returning()

    return result!
  }
}
