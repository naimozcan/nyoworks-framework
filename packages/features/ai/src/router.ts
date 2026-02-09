// ═══════════════════════════════════════════════════════════════════════════════
// AI Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import {
  chatMessageSchema,
  startConversationSchema,
  generateContentSchema,
  summarizeTextSchema,
  processDocumentSchema,
  createPromptSchema,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrpcProcedure {
  input: (schema: z.ZodTypeAny) => {
    mutation: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
    query: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
  }
}

interface TrpcInstance {
  router: (routes: Record<string, unknown>) => unknown
  protectedProcedure: TrpcProcedure
  publicProcedure: TrpcProcedure
}

// ─────────────────────────────────────────────────────────────────────────────
// Router Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createAIRouter(trpc: TrpcInstance) {
  return trpc.router({
    chat: trpc.router({
      send: trpc.publicProcedure
        .input(chatMessageSchema)
        .mutation(async ({ input: _input }) => {
          return { response: "", conversationId: "placeholder" }
        }),

      startConversation: trpc.publicProcedure
        .input(startConversationSchema)
        .mutation(async ({ input: _input }) => {
          return { conversationId: "placeholder" }
        }),

      getHistory: trpc.protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ input: _input }) => {
          return { messages: [] }
        }),

      endConversation: trpc.protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),
    }),

    content: trpc.router({
      generate: trpc.protectedProcedure
        .input(generateContentSchema)
        .mutation(async ({ input: _input }) => {
          return { content: "" }
        }),

      summarize: trpc.protectedProcedure
        .input(summarizeTextSchema)
        .mutation(async ({ input: _input }) => {
          return { summary: "" }
        }),

      generateProductDescription: trpc.protectedProcedure
        .input(z.object({
          productName: z.string(),
          features: z.array(z.string()),
          tone: z.enum(["professional", "casual", "friendly"]).default("professional"),
          language: z.string().default("nl"),
        }))
        .mutation(async ({ input: _input }) => {
          return { description: "" }
        }),
    }),

    document: trpc.router({
      process: trpc.protectedProcedure
        .input(processDocumentSchema)
        .mutation(async ({ input: _input }) => {
          return { extractedData: {} }
        }),

      extractInvoice: trpc.protectedProcedure
        .input(z.object({ imageBase64: z.string() }))
        .mutation(async ({ input: _input }) => {
          return { data: {} }
        }),

      extractReceipt: trpc.protectedProcedure
        .input(z.object({ imageBase64: z.string() }))
        .mutation(async ({ input: _input }) => {
          return { data: {} }
        }),
    }),

    prompts: trpc.router({
      list: trpc.protectedProcedure
        .input(z.object({ category: z.string().optional() }))
        .query(async ({ input: _input }) => {
          return { prompts: [] }
        }),

      create: trpc.protectedProcedure
        .input(createPromptSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true, promptId: "placeholder" }
        }),

      update: trpc.protectedProcedure
        .input(z.object({
          id: z.string(),
          systemPrompt: z.string().optional(),
          parameters: z.record(z.string(), z.unknown()).optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      delete: trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),
    }),
  })
}
