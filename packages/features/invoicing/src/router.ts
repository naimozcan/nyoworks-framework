// ═══════════════════════════════════════════════════════════════════════════════
// Invoicing Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { createInvoiceSchema, updateInvoiceSchema } from "./validators.js"

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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createInvoicingRouter(trpc: TrpcInstance) {
  return trpc.router({
    create: trpc.protectedProcedure
      .input(createInvoiceSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, invoiceId: "placeholder" }
      }),

    getById: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input: _input }) => {
        return null
      }),

    list: trpc.protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        customerId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input: _input }) => {
        return { invoices: [], total: 0 }
      }),

    update: trpc.protectedProcedure
      .input(z.object({
        id: z.string(),
        data: updateInvoiceSchema,
      }))
      .mutation(async ({ input: _input }) => {
        return { success: true }
      }),

    generateUbl: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input: _input }) => {
        return { success: true, xml: null }
      }),

    sendViaPeppol: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input: _input }) => {
        return { success: true, peppolId: null }
      }),

    downloadPdf: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input: _input }) => {
        return { pdfUrl: null }
      }),

    markAsPaid: trpc.protectedProcedure
      .input(z.object({ id: z.string(), paidAt: z.date().optional() }))
      .mutation(async ({ input: _input }) => {
        return { success: true }
      }),
  })
}
