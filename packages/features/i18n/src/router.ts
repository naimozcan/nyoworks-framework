// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, like, asc, sql } from "drizzle-orm"
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
import { translations, locales } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface I18nContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
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
      const db = ctx.db as never

      let query = db
        .select()
        .from(locales)
        .where(eq(locales.tenantId, ctx.tenantId))

      if (input.enabledOnly) {
        query = query.where(eq(locales.isEnabled, "true"))
      }

      return query.orderBy(asc(locales.name))
    }),

  create: protectedProcedure
    .input(createLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.isDefault) {
        await db
          .update(locales)
          .set({ isDefault: "false" })
          .where(eq(locales.tenantId, ctx.tenantId))
      }

      const [locale] = await db
        .insert(locales)
        .values({
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          nativeName: input.nativeName,
          isDefault: input.isDefault ? "true" : "false",
          isEnabled: input.isEnabled ? "true" : "false",
        })
        .returning()

      return locale
    }),

  update: protectedProcedure
    .input(updateLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const { localeId, isDefault, isEnabled, ...updateData } = input
      const db = ctx.db as never

      if (isDefault) {
        await db
          .update(locales)
          .set({ isDefault: "false" })
          .where(eq(locales.tenantId, ctx.tenantId))
      }

      const updatePayload: Record<string, unknown> = { ...updateData }
      if (isDefault !== undefined) {
        updatePayload.isDefault = isDefault ? "true" : "false"
      }
      if (isEnabled !== undefined) {
        updatePayload.isEnabled = isEnabled ? "true" : "false"
      }

      const [locale] = await db
        .update(locales)
        .set(updatePayload)
        .where(and(eq(locales.id, localeId), eq(locales.tenantId, ctx.tenantId)))
        .returning()

      if (!locale) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Locale not found" })
      }

      return locale
    }),

  delete: protectedProcedure
    .input(deleteLocaleInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [locale] = await db
        .select()
        .from(locales)
        .where(and(eq(locales.id, input.localeId), eq(locales.tenantId, ctx.tenantId)))
        .limit(1)

      if (!locale) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Locale not found" })
      }

      if (locale.isDefault === "true") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete default locale" })
      }

      await db
        .delete(translations)
        .where(and(eq(translations.tenantId, ctx.tenantId), eq(translations.locale, locale.code)))

      await db
        .delete(locales)
        .where(eq(locales.id, input.localeId))

      return { success: true }
    }),

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    const [locale] = await db
      .select()
      .from(locales)
      .where(and(eq(locales.tenantId, ctx.tenantId), eq(locales.isDefault, "true")))
      .limit(1)

    return locale || null
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Translations Router
// ─────────────────────────────────────────────────────────────────────────────

const translationsRouter = t.router({
  get: protectedProcedure
    .input(getTranslationsInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const items = await db
        .select()
        .from(translations)
        .where(
          and(
            eq(translations.tenantId, ctx.tenantId),
            eq(translations.locale, input.locale),
            eq(translations.namespace, input.namespace)
          )
        )
        .orderBy(asc(translations.key))

      const result: Record<string, string> = {}
      for (const item of items) {
        result[item.key] = item.value
      }

      return result
    }),

  getOne: protectedProcedure
    .input(getTranslationInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [translation] = await db
        .select()
        .from(translations)
        .where(
          and(
            eq(translations.tenantId, ctx.tenantId),
            eq(translations.locale, input.locale),
            eq(translations.namespace, input.namespace),
            eq(translations.key, input.key)
          )
        )
        .limit(1)

      return translation || null
    }),

  add: protectedProcedure
    .input(addTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const existing = await db
        .select()
        .from(translations)
        .where(
          and(
            eq(translations.tenantId, ctx.tenantId),
            eq(translations.locale, input.locale),
            eq(translations.namespace, input.namespace),
            eq(translations.key, input.key)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Translation already exists" })
      }

      const [translation] = await db
        .insert(translations)
        .values({
          tenantId: ctx.tenantId,
          locale: input.locale,
          namespace: input.namespace,
          key: input.key,
          value: input.value,
        })
        .returning()

      return translation
    }),

  update: protectedProcedure
    .input(updateTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [translation] = await db
        .update(translations)
        .set({
          value: input.value,
          updatedAt: new Date(),
        })
        .where(and(eq(translations.id, input.translationId), eq(translations.tenantId, ctx.tenantId)))
        .returning()

      if (!translation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Translation not found" })
      }

      return translation
    }),

  delete: protectedProcedure
    .input(deleteTranslationInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(translations)
        .where(and(eq(translations.id, input.translationId), eq(translations.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Translation not found" })
      }

      return { success: true }
    }),

  bulkAdd: protectedProcedure
    .input(bulkAddTranslationsInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const values = input.translations.map((t) => ({
        tenantId: ctx.tenantId,
        locale: input.locale,
        namespace: input.namespace,
        key: t.key,
        value: t.value,
      }))

      await db.insert(translations).values(values).onConflictDoNothing()

      return { success: true, count: values.length }
    }),

  list: protectedProcedure
    .input(listTranslationsInput)
    .query(async ({ input, ctx }) => {
      const { locale, namespace, search, limit, offset } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(translations)
        .where(eq(translations.tenantId, ctx.tenantId))

      if (locale) {
        query = query.where(eq(translations.locale, locale))
      }

      if (namespace) {
        query = query.where(eq(translations.namespace, namespace))
      }

      if (search) {
        query = query.where(like(translations.key, `%${search}%`))
      }

      const items = await query
        .orderBy(asc(translations.namespace), asc(translations.key))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(translations)
        .where(eq(translations.tenantId, ctx.tenantId))

      return {
        items,
        total: countResult[0]?.count || 0,
        hasMore: offset + limit < (countResult[0]?.count || 0),
      }
    }),

  listNamespaces: protectedProcedure
    .input(listNamespacesInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      let query = db
        .select({ namespace: translations.namespace })
        .from(translations)
        .where(eq(translations.tenantId, ctx.tenantId))

      if (input.locale) {
        query = query.where(eq(translations.locale, input.locale))
      }

      const results = await query.groupBy(translations.namespace).orderBy(asc(translations.namespace))

      return results.map((r: { namespace: string }) => r.namespace)
    }),

  export: protectedProcedure
    .input(exportTranslationsInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      let query = db
        .select()
        .from(translations)
        .where(
          and(
            eq(translations.tenantId, ctx.tenantId),
            eq(translations.locale, input.locale)
          )
        )

      if (input.namespace) {
        query = query.where(eq(translations.namespace, input.namespace))
      }

      const items = await query.orderBy(asc(translations.namespace), asc(translations.key))

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
        result[item.namespace][item.key] = item.value
      }
      return result
    }),

  import: protectedProcedure
    .input(importTranslationsInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { locale, namespace, translations: inputTranslations, overwrite } = input

      let imported = 0
      let skipped = 0

      for (const [key, value] of Object.entries(inputTranslations)) {
        const existing = await db
          .select()
          .from(translations)
          .where(
            and(
              eq(translations.tenantId, ctx.tenantId),
              eq(translations.locale, locale),
              eq(translations.namespace, namespace),
              eq(translations.key, key)
            )
          )
          .limit(1)

        if (existing.length > 0) {
          if (overwrite) {
            await db
              .update(translations)
              .set({ value, updatedAt: new Date() })
              .where(eq(translations.id, existing[0].id))
            imported++
          } else {
            skipped++
          }
        } else {
          await db.insert(translations).values({
            tenantId: ctx.tenantId,
            locale,
            namespace,
            key,
            value,
          })
          imported++
        }
      }

      return { imported, skipped }
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
