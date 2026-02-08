// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
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
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface I18nContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<I18nContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Locales Router
// ─────────────────────────────────────────────────────────────────────────────

const localesRouter = t.router({
  list: protectedProcedure
    .input(listLocalesInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.listLocales(input.enabledOnly)
    }),

  create: protectedProcedure
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

  update: protectedProcedure
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

  delete: protectedProcedure
    .input(deleteLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.deleteLocale(input.localeId)
    }),

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const service = new I18nService(ctx.db, ctx.tenantId)
    return service.getDefaultLocale()
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Translations Router
// ─────────────────────────────────────────────────────────────────────────────

const translationsRouter = t.router({
  get: protectedProcedure
    .input(getTranslationsInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.getTranslations(input.locale, input.namespace)
    }),

  getOne: protectedProcedure
    .input(getTranslationInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.getTranslation(input.locale, input.namespace, input.key)
    }),

  add: protectedProcedure
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

  update: protectedProcedure
    .input(updateTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.updateTranslation(input.translationId, input.value)
    }),

  delete: protectedProcedure
    .input(deleteTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.deleteTranslation(input.translationId)
    }),

  bulkAdd: protectedProcedure
    .input(bulkAddTranslationsInput)
    .mutation(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.bulkAddTranslations({
        locale: input.locale,
        namespace: input.namespace,
        translations: input.translations,
      })
    }),

  list: protectedProcedure
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

  listNamespaces: protectedProcedure
    .input(listNamespacesInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.listNamespaces(input.locale)
    }),

  export: protectedProcedure
    .input(exportTranslationsInput)
    .query(async ({ input, ctx }) => {
      const service = new I18nService(ctx.db, ctx.tenantId)
      return service.exportTranslations({
        format: input.format,
        locale: input.locale,
        namespace: input.namespace,
      })
    }),

  import: protectedProcedure
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

export const i18nRouter = t.router({
  locales: localesRouter,
  translations: translationsRouter,
})

export type I18nRouter = typeof i18nRouter
