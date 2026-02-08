// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export const eventType = z.enum(["track", "identify", "page", "screen", "group", "alias"])

// ─────────────────────────────────────────────────────────────────────────────
// Track Event
// ─────────────────────────────────────────────────────────────────────────────

export const trackEventInput = z.object({
  eventName: z.string().min(1).max(255),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  timestamp: z.date().optional(),
})

export const trackEventOutput = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  timestamp: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Pageview
// ─────────────────────────────────────────────────────────────────────────────

export const trackPageviewInput = z.object({
  pathname: z.string().min(1),
  title: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  duration: z.number().int().min(0).optional(),
})

export const pageviewOutput = z.object({
  id: z.string().uuid(),
  pathname: z.string(),
  timestamp: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Query Filters
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsQueryInput = z.object({
  startDate: z.date(),
  endDate: z.date(),
  eventName: z.string().optional(),
  userId: z.string().uuid().optional(),
  groupBy: z.enum(["hour", "day", "week", "month"]).default("day"),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
})

export const eventCountOutput = z.object({
  date: z.date(),
  count: z.number(),
})

export const topEventsOutput = z.object({
  eventName: z.string(),
  count: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export const createSessionInput = z.object({
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
  entryPage: z.string().optional(),
})

export const updateSessionInput = z.object({
  sessionId: z.string(),
  exitPage: z.string().optional(),
  endedAt: z.date().optional(),
})

export const sessionOutput = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  pageviewCount: z.number(),
  eventCount: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = z.infer<typeof eventType>
export type TrackEventInput = z.infer<typeof trackEventInput>
export type TrackEventOutput = z.infer<typeof trackEventOutput>
export type TrackPageviewInput = z.infer<typeof trackPageviewInput>
export type PageviewOutput = z.infer<typeof pageviewOutput>
export type AnalyticsQueryInput = z.infer<typeof analyticsQueryInput>
export type EventCountOutput = z.infer<typeof eventCountOutput>
export type TopEventsOutput = z.infer<typeof topEventsOutput>
export type CreateSessionInput = z.infer<typeof createSessionInput>
export type UpdateSessionInput = z.infer<typeof updateSessionInput>
export type SessionOutput = z.infer<typeof sessionOutput>
