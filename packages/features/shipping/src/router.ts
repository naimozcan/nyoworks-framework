// ═══════════════════════════════════════════════════════════════════════════════
// Shipping Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { createShipmentSchema, updateShipmentSchema } from "./validators.js"

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

export function createShippingRouter(trpc: TrpcInstance) {
  return trpc.router({
    create: trpc.protectedProcedure
      .input(createShipmentSchema)
      .mutation(async ({ input: _input }) => {
        return { success: true, shipmentId: "placeholder" }
      }),

    getById: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input: _input }) => {
        return null
      }),

    list: trpc.protectedProcedure
      .input(z.object({
        orderId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input: _input }) => {
        return { shipments: [], total: 0 }
      }),

    update: trpc.protectedProcedure
      .input(z.object({
        id: z.string(),
        data: updateShipmentSchema,
      }))
      .mutation(async ({ input: _input }) => {
        return { success: true }
      }),

    createLabel: trpc.protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input: _input }) => {
        return { success: true, labelUrl: null }
      }),

    track: trpc.protectedProcedure
      .input(z.object({ trackingNumber: z.string() }))
      .query(async ({ input: _input }) => {
        return { status: "unknown", events: [] }
      }),
  })
}
