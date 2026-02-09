// ═══════════════════════════════════════════════════════════════════════════════
// Google Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { createEventSchema, updateEventSchema, geocodeAddressSchema, calculateRouteSchema } from "./validators.js"

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

export function createGoogleRouter(trpc: TrpcInstance) {
  return trpc.router({
    calendar: trpc.router({
      getAuthUrl: trpc.protectedProcedure
        .input(z.object({ state: z.string().optional() }))
        .query(async ({ input: _input }) => {
          return { url: "" }
        }),

      exchangeCode: trpc.protectedProcedure
        .input(z.object({ code: z.string() }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      listCalendars: trpc.protectedProcedure
        .query(async () => {
          return { calendars: [] }
        }),

      listEvents: trpc.protectedProcedure
        .input(z.object({
          calendarId: z.string().default("primary"),
          timeMin: z.date().optional(),
          timeMax: z.date().optional(),
          maxResults: z.number().default(100),
        }))
        .query(async ({ input: _input }) => {
          return { events: [] }
        }),

      createEvent: trpc.protectedProcedure
        .input(z.object({
          calendarId: z.string().default("primary"),
          event: createEventSchema,
        }))
        .mutation(async ({ input: _input }) => {
          return { success: true, eventId: "placeholder" }
        }),

      updateEvent: trpc.protectedProcedure
        .input(z.object({
          calendarId: z.string().default("primary"),
          eventId: z.string(),
          updates: updateEventSchema,
        }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      deleteEvent: trpc.protectedProcedure
        .input(z.object({
          calendarId: z.string().default("primary"),
          eventId: z.string(),
        }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),
    }),

    maps: trpc.router({
      geocode: trpc.protectedProcedure
        .input(geocodeAddressSchema)
        .query(async ({ input: _input }) => {
          return null
        }),

      reverseGeocode: trpc.protectedProcedure
        .input(z.object({ lat: z.number(), lng: z.number() }))
        .query(async ({ input: _input }) => {
          return null
        }),

      calculateRoute: trpc.protectedProcedure
        .input(calculateRouteSchema)
        .query(async ({ input: _input }) => {
          return null
        }),

      distanceMatrix: trpc.protectedProcedure
        .input(z.object({
          origins: z.array(z.object({ lat: z.number(), lng: z.number() })),
          destinations: z.array(z.object({ lat: z.number(), lng: z.number() })),
          mode: z.enum(["driving", "walking", "bicycling", "transit"]).default("driving"),
        }))
        .query(async ({ input: _input }) => {
          return { results: [] }
        }),
    }),
  })
}
