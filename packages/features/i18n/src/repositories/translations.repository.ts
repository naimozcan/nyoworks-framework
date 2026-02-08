// ═══════════════════════════════════════════════════════════════════════════════
// Translations Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, like, asc, sql } from "drizzle-orm"
import { translations, type Translation, type NewTranslation } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListTranslationsOptions {
  locale?: string
  namespace?: string
  search?: string
  limit: number
  offset: number
}

export interface ListTranslationsResult {
  items: Translation[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TranslationsRepository {
  constructor(
    private readonly db: any,
    private readonly tenantId: string
  ) {}

  async findById(id: string): Promise<Translation | null> {
    const [result] = await this.db
      .select()
      .from(translations)
      .where(and(eq(translations.id, id), eq(translations.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async findByKey(locale: string, namespace: string, key: string): Promise<Translation | null> {
    const [result] = await this.db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.tenantId, this.tenantId),
          eq(translations.locale, locale),
          eq(translations.namespace, namespace),
          eq(translations.key, key)
        )
      )
      .limit(1)

    return result ?? null
  }

  async getByLocaleAndNamespace(locale: string, namespace: string): Promise<Record<string, string>> {
    const items = await this.db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.tenantId, this.tenantId),
          eq(translations.locale, locale),
          eq(translations.namespace, namespace)
        )
      )
      .orderBy(asc(translations.key))

    const result: Record<string, string> = {}
    for (const item of items) {
      result[item.key] = item.value
    }

    return result
  }

  async list(options: ListTranslationsOptions): Promise<ListTranslationsResult> {
    const conditions = [eq(translations.tenantId, this.tenantId)]

    if (options.locale) {
      conditions.push(eq(translations.locale, options.locale))
    }

    if (options.namespace) {
      conditions.push(eq(translations.namespace, options.namespace))
    }

    if (options.search) {
      conditions.push(like(translations.key, `%${options.search}%`))
    }

    const items = await this.db
      .select()
      .from(translations)
      .where(and(...conditions))
      .orderBy(asc(translations.namespace), asc(translations.key))
      .limit(options.limit)
      .offset(options.offset)

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .where(and(...conditions))

    const total = countResult?.count ?? 0

    return {
      items,
      total,
      hasMore: options.offset + options.limit < total,
    }
  }

  async listNamespaces(locale?: string): Promise<string[]> {
    const conditions = [eq(translations.tenantId, this.tenantId)]

    if (locale) {
      conditions.push(eq(translations.locale, locale))
    }

    const results = await this.db
      .select({ namespace: translations.namespace })
      .from(translations)
      .where(and(...conditions))
      .groupBy(translations.namespace)
      .orderBy(asc(translations.namespace))

    return results.map((r: { namespace: string }) => r.namespace)
  }

  async create(data: Omit<NewTranslation, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Translation> {
    const [result] = await this.db
      .insert(translations)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async update(id: string, value: string): Promise<Translation | null> {
    const [result] = await this.db
      .update(translations)
      .set({
        value,
        updatedAt: new Date(),
      })
      .where(and(eq(translations.id, id), eq(translations.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(translations)
      .where(and(eq(translations.id, id), eq(translations.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async deleteByLocale(localeCode: string): Promise<number> {
    const result = await this.db
      .delete(translations)
      .where(and(eq(translations.tenantId, this.tenantId), eq(translations.locale, localeCode)))
      .returning()

    return result.length
  }

  async bulkCreate(items: Omit<NewTranslation, "id" | "createdAt" | "updatedAt" | "tenantId">[]): Promise<number> {
    if (items.length === 0) return 0

    const values = items.map((item) => ({
      ...item,
      tenantId: this.tenantId,
    }))

    await this.db.insert(translations).values(values).onConflictDoNothing()

    return values.length
  }

  async exportByLocale(locale: string, namespace?: string): Promise<Translation[]> {
    const conditions = [
      eq(translations.tenantId, this.tenantId),
      eq(translations.locale, locale),
    ]

    if (namespace) {
      conditions.push(eq(translations.namespace, namespace))
    }

    return this.db
      .select()
      .from(translations)
      .where(and(...conditions))
      .orderBy(asc(translations.namespace), asc(translations.key))
  }
}
