// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import {
  sendTextMessageSchema,
  sendTemplateMessageSchema,
  sendImageMessageSchema,
  sendInteractiveButtonsSchema,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrpcInstance {
  router: (routes: Record<string, unknown>) => unknown
  protectedProcedure: {
    input: (schema: z.ZodTypeAny) => {
      mutation: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
      query: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
    }
    query: (handler: (opts: { ctx: unknown }) => Promise<unknown>) => unknown
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createWhatsAppRouter(trpc: TrpcInstance) {
  return trpc.router({
    sendText: trpc.protectedProcedure
      .input(sendTextMessageSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, messageId: "placeholder" }
      }),

    sendTemplate: trpc.protectedProcedure
      .input(sendTemplateMessageSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, messageId: "placeholder" }
      }),

    sendImage: trpc.protectedProcedure
      .input(sendImageMessageSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, messageId: "placeholder" }
      }),

    sendInteractive: trpc.protectedProcedure
      .input(sendInteractiveButtonsSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, messageId: "placeholder" }
      }),

    getMessages: trpc.protectedProcedure
      .input(z.object({
        contactId: z.string().optional(),
        phoneNumber: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input: _input }) => {
        return { messages: [], total: 0 }
      }),

    getContacts: trpc.protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input: _input }) => {
        return { contacts: [], total: 0 }
      }),

    getTemplates: trpc.protectedProcedure
      .query(async () => {
        return { templates: [] }
      }),

    markAsRead: trpc.protectedProcedure
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ input: _input }) => {
        return { success: true }
      }),
  })
}
