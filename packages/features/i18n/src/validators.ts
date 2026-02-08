// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Locale Validators
// ─────────────────────────────────────────────────────────────────────────────

export const localeCode = z.string().min(2).max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/)

export const listLocalesInput = z.object({
  enabledOnly: z.boolean().default(true),
})

export const createLocaleInput = z.object({
  code: localeCode,
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  nativeName: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  isDefault: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
})

export const updateLocaleInput = z.object({
  localeId: z.string().uuid(),
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  nativeName: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
})

export const deleteLocaleInput = z.object({
  localeId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Translation Validators
// ─────────────────────────────────────────────────────────────────────────────

export const getTranslationsInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).default("common"),
})

export const getTranslationInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).default("common"),
  key: z.string().min(1).max(500),
})

export const addTranslationInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).default("common"),
  key: z.string().min(1).max(500),
  value: z.string().min(1).max(10000),
})

export const updateTranslationInput = z.object({
  translationId: z.string().uuid(),
  value: z.string().min(1).max(10000),
})

export const deleteTranslationInput = z.object({
  translationId: z.string().uuid(),
})

export const bulkAddTranslationsInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).default("common"),
  translations: z.array(z.object({
    key: z.string().min(1).max(500),
    value: z.string().min(1).max(10000),
  })).min(1).max(PAGINATION.MAX_LIMIT * 10),
})

export const listTranslationsInput = z.object({
  locale: localeCode.optional(),
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  search: z.string().max(200).optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

export const listNamespacesInput = z.object({
  locale: localeCode.optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────────────────────

export const exportTranslationsInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  format: z.enum(["nested", "flat"]).default("nested"),
})

export const importTranslationsInput = z.object({
  locale: localeCode,
  namespace: z.string().min(1).max(PAGINATION.MAX_LIMIT).default("common"),
  translations: z.record(z.string(), z.string()),
  overwrite: z.boolean().default(false),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type LocaleCode = z.infer<typeof localeCode>
export type ListLocalesInput = z.infer<typeof listLocalesInput>
export type CreateLocaleInput = z.infer<typeof createLocaleInput>
export type UpdateLocaleInput = z.infer<typeof updateLocaleInput>
export type DeleteLocaleInput = z.infer<typeof deleteLocaleInput>

export type GetTranslationsInput = z.infer<typeof getTranslationsInput>
export type GetTranslationInput = z.infer<typeof getTranslationInput>
export type AddTranslationInput = z.infer<typeof addTranslationInput>
export type UpdateTranslationInput = z.infer<typeof updateTranslationInput>
export type DeleteTranslationInput = z.infer<typeof deleteTranslationInput>
export type BulkAddTranslationsInput = z.infer<typeof bulkAddTranslationsInput>
export type ListTranslationsInput = z.infer<typeof listTranslationsInput>
export type ListNamespacesInput = z.infer<typeof listNamespacesInput>

export type ExportTranslationsInput = z.infer<typeof exportTranslationsInput>
export type ImportTranslationsInput = z.infer<typeof importTranslationsInput>
