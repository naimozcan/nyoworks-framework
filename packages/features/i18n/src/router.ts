// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
import {
  listLocalesInput,
  createLocaleInput,
  updateLocaleInput,
  deleteLocaleInput,
  getTranslationsInput,
  getTranslationInput,
  addTranslationInput,
  updateTranslationInput,
  deleteTranslationInput,
  bulkAddTranslationsInput,
  listTranslationsInput,
  listNamespacesInput,
  exportTranslationsInput,
  importTranslationsInput,
} from "./validators.js"
import { I18nService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Locales Router
// ─────────────────────────────────────────────────────────────────────────────

const localesRouter = router({
  list: tenantProcedure
    .input(listLocalesInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.listLocales(input.enabledOnly)
    }),

  create: tenantProcedure
    .input(createLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.createLocale({
        code: input.code,
        name: input.name,
        nativeName: input.nativeName,
        isDefault: input.isDefault,
        isEnabled: input.isEnabled,
      })
    }),

  update: tenantProcedure
    .input(updateLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.updateLocale({
        localeId: input.localeId,
        name: input.name,
        nativeName: input.nativeName,
        isDefault: input.isDefault,
        isEnabled: input.isEnabled,
      })
    }),

  delete: tenantProcedure
    .input(deleteLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.deleteLocale(input.localeId)
    }),

  getDefault: tenantProcedure.query(async ({ ctx }) => {
    const service = new I18nService(ctx.db, ctx.tenantId)
    return service.getDefaultLocale()
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Translations Router
// ─────────────────────────────────────────────────────────────────────────────

const translationsRouter = router({
  get: tenantProcedure
    .input(getTranslationsInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.getTranslations(input.locale, input.namespace)
    }),

  getOne: tenantProcedure
    .input(getTranslationInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.getTranslation(input.locale, input.namespace, input.key)
    }),

  add: tenantProcedure
    .input(addTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.addTranslation({
        locale: input.locale,
        namespace: input.namespace,
        key: input.key,
        value: input.value,
      })
    }),

  update: tenantProcedure
    .input(updateTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.updateTranslation(input.translationId, input.value)
    }),

  delete: tenantProcedure
    .input(deleteTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.deleteTranslation(input.translationId)
    }),

  bulkAdd: tenantProcedure
    .input(bulkAddTranslationsInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.bulkAddTranslations({
        locale: input.locale,
        namespace: input.namespace,
        translations: input.translations,
      })
    }),

  list: tenantProcedure
    .input(listTranslationsInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.listTranslations({
        locale: input.locale,
        namespace: input.namespace,
        search: input.search,
        limit: input.limit,
        offset: input.offset,
      })
    }),

  listNamespaces: tenantProcedure
    .input(listNamespacesInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.listNamespaces(input.locale)
    }),

  export: tenantProcedure
    .input(exportTranslationsInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.exportTranslations({
        format: input.format,
        locale: input.locale,
        namespace: input.namespace,
      })
    }),

  import: tenantProcedure
    .input(importTranslationsInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.importTranslations({
        locale: input.locale,
        namespace: input.namespace,
        translations: input.translations,
        overwrite: input.overwrite,
      })
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const i18nRouter = router({
  locales: localesRouter,
  translations: translationsRouter,
})

export type I18nRouter = typeof i18nRouter
