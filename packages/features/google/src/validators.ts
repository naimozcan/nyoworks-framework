// ═══════════════════════════════════════════════════════════════════════════════
// Google Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Event Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.date(),
  end: z.date(),
  timeZone: z.string().default("Europe/Amsterdam"),
  attendees: z.array(z.string().email()).optional(),
  sendNotifications: z.boolean().default(true),
})

export const updateEventSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.date().optional(),
  end: z.date().optional(),
  attendees: z.array(z.string().email()).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Maps Validators
// ─────────────────────────────────────────────────────────────────────────────

export const geocodeAddressSchema = z.object({
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().default("NL"),
})

export const calculateRouteSchema = z.object({
  origin: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  mode: z.enum(["driving", "walking", "bicycling", "transit"]).default("driving"),
  departureTime: z.date().optional(),
})

export type GeocodeAddressInput = z.infer<typeof geocodeAddressSchema>
export type CalculateRouteInput = z.infer<typeof calculateRouteSchema>
