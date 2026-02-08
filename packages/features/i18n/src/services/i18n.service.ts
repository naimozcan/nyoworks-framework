// ═══════════════════════════════════════════════════════════════════════════════
// i18n Service
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import { LocalesRepository, TranslationsRepository } from "../repositories/index.js"
import type { Locale, Translation } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLocaleInput {
  code: string
  name: string
  nativeName: string
  isDefault?: boolean
  isEnabled?: boolean
}

export interface UpdateLocaleInput {
  localeId: string
  name?: string
  nativeName?: string
  isDefault?: boolean
  isEnabled?: boolean
}

export interface AddTranslationInput {
  locale: string
  namespace: string
  key: string
  value: string
}

export interface BulkAddTranslationsInput {
  locale: string
  namespace: string
  translations: Array<{ key: string; value: string }>
}

export interface ListTranslationsInput {
  locale?: string
  namespace?: string
  search?: string
  limit: number
  offset: number
}

export interface ImportTranslationsInput {
  locale: string
  namespace: string
  translations: Record<string, string>
  overwrite?: boolean
}

export interface ExportFormat {
  format?: "nested" | "flat"
  locale: string
  namespace?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class I18nService {
  private readonly localesRepo: LocalesRepository
  private readonly translationsRepo: TranslationsRepository

  constructor(
    db: unknown,
    tenantId: string
  ) {
    this.localesRepo = new LocalesRepository(db, tenantId)
    this.translationsRepo = new TranslationsRepository(db, tenantId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Locales
  // ─────────────────────────────────────────────────────────────────────────────

  async listLocales(enabledOnly?: boolean): Promise<Locale[]> {
    return this.localesRepo.list({ enabledOnly })
  }

  async getDefaultLocale(): Promise<Locale | null> {
    return this.localesRepo.findDefault()
  }

  async createLocale(input: CreateLocaleInput): Promise<Locale> {
    if (input.isDefault) {
      await this.localesRepo.clearDefaultFlag()
    }

    return this.localesRepo.create({
      code: input.code,
      name: input.name,
      nativeName: input.nativeName,
      isDefault: input.isDefault ? "true" : "false",
      isEnabled: input.isEnabled !== false ? "true" : "false",
    })
  }

  async updateLocale(input: UpdateLocaleInput): Promise<Locale> {
    if (input.isDefault) {
      await this.localesRepo.clearDefaultFlag()
    }

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.nativeName !== undefined) updateData.nativeName = input.nativeName
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? "true" : "false"
    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled ? "true" : "false"

    const locale = await this.localesRepo.update(input.localeId, updateData as any)

    if (!locale) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Locale not found" })
    }

    return locale
  }

  async deleteLocale(localeId: string): Promise<{ success: boolean }> {
    const locale = await this.localesRepo.findById(localeId)

    if (!locale) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Locale not found" })
    }

    if (locale.isDefault === "true") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete default locale" })
    }

    await this.translationsRepo.deleteByLocale(locale.code)
    await this.localesRepo.delete(localeId)

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Translations
  // ─────────────────────────────────────────────────────────────────────────────

  async getTranslations(locale: string, namespace: string): Promise<Record<string, string>> {
    return this.translationsRepo.getByLocaleAndNamespace(locale, namespace)
  }

  async getTranslation(locale: string, namespace: string, key: string): Promise<Translation | null> {
    return this.translationsRepo.findByKey(locale, namespace, key)
  }

  async addTranslation(input: AddTranslationInput): Promise<Translation> {
    const existing = await this.translationsRepo.findByKey(input.locale, input.namespace, input.key)

    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Translation already exists" })
    }

    return this.translationsRepo.create({
      locale: input.locale,
      namespace: input.namespace,
      key: input.key,
      value: input.value,
    })
  }

  async updateTranslation(translationId: string, value: string): Promise<Translation> {
    const translation = await this.translationsRepo.update(translationId, value)

    if (!translation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Translation not found" })
    }

    return translation
  }

  async deleteTranslation(translationId: string): Promise<{ success: boolean }> {
    const deleted = await this.translationsRepo.delete(translationId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Translation not found" })
    }

    return { success: true }
  }

  async bulkAddTranslations(input: BulkAddTranslationsInput): Promise<{ success: boolean; count: number }> {
    const items = input.translations.map((t) => ({
      locale: input.locale,
      namespace: input.namespace,
      key: t.key,
      value: t.value,
    }))

    const count = await this.translationsRepo.bulkCreate(items)

    return { success: true, count }
  }

  async listTranslations(input: ListTranslationsInput) {
    return this.translationsRepo.list(input)
  }

  async listNamespaces(locale?: string): Promise<string[]> {
    return this.translationsRepo.listNamespaces(locale)
  }

  async exportTranslations(input: ExportFormat): Promise<Record<string, unknown>> {
    const items = await this.translationsRepo.exportByLocale(input.locale, input.namespace)

    if (input.format === "flat") {
      const result: Record<string, string> = {}
      for (const item of items) {
        const fullKey = `${item.namespace}.${item.key}`
        result[fullKey] = item.value
      }
      return result
    }

    const result: Record<string, Record<string, string>> = {}
    for (const item of items) {
      if (!result[item.namespace]) {
        result[item.namespace] = {}
      }
      result[item.namespace]![item.key] = item.value
    }
    return result
  }

  async importTranslations(input: ImportTranslationsInput): Promise<{ imported: number; skipped: number }> {
    let imported = 0
    let skipped = 0

    for (const [key, value] of Object.entries(input.translations)) {
      const existing = await this.translationsRepo.findByKey(input.locale, input.namespace, key)

      if (existing) {
        if (input.overwrite) {
          await this.translationsRepo.update(existing.id, value)
          imported++
        } else {
          skipped++
        }
      } else {
        await this.translationsRepo.create({
          locale: input.locale,
          namespace: input.namespace,
          key,
          value,
        })
        imported++
      }
    }

    return { imported, skipped }
  }
}
