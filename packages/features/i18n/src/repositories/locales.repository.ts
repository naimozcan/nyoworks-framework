// ═══════════════════════════════════════════════════════════════════════════════
// Locales Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, asc } from "drizzle-orm"
import { locales, type Locale, type NewLocale } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListLocalesOptions {
  enabledOnly?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class LocalesRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async list(options?: ListLocalesOptions): Promise<Locale[]> {
    const conditions = [eq(locales.tenantId, this.tenantId)]

    if (options?.enabledOnly) {
      conditions.push(eq(locales.isEnabled, "true"))
    }

    return this.db
      .select()
      .from(locales)
      .where(and(...conditions))
      .orderBy(asc(locales.name))
  }

  async findById(id: string): Promise<Locale | null> {
    const [result] = await this.db
      .select()
      .from(locales)
      .where(and(eq(locales.id, id), eq(locales.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async findByCode(code: string): Promise<Locale | null> {
    const [result] = await this.db
      .select()
      .from(locales)
      .where(and(eq(locales.code, code), eq(locales.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async findDefault(): Promise<Locale | null> {
    const [result] = await this.db
      .select()
      .from(locales)
      .where(and(eq(locales.tenantId, this.tenantId), eq(locales.isDefault, "true")))
      .limit(1)

    return result ?? null
  }

  async create(data: Omit<NewLocale, "id" | "createdAt" | "tenantId">): Promise<Locale> {
    const [result] = await this.db
      .insert(locales)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async update(id: string, data: Partial<Pick<Locale, "name" | "nativeName" | "isDefault" | "isEnabled">>): Promise<Locale | null> {
    const [result] = await this.db
      .update(locales)
      .set(data)
      .where(and(eq(locales.id, id), eq(locales.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(locales)
      .where(and(eq(locales.id, id), eq(locales.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async clearDefaultFlag(): Promise<void> {
    await this.db
      .update(locales)
      .set({ isDefault: "false" })
      .where(eq(locales.tenantId, this.tenantId))
  }
}
