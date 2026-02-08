// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Channel Validators
// ─────────────────────────────────────────────────────────────────────────────

export const joinChannelInput = z.object({
  channelId: z.string().min(1).max(255),
  metadata: z.record(z.unknown()).optional(),
})

export const leaveChannelInput = z.object({
  channelId: z.string().min(1).max(255),
})

export const createChannelInput = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["public", "private", "presence"]).default("public"),
  metadata: z.record(z.unknown()).optional(),
})

export const getChannelInput = z.object({
  channelId: z.string().uuid(),
})

export const listChannelsInput = z.object({
  type: z.enum(["public", "private", "presence"]).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Validators
// ─────────────────────────────────────────────────────────────────────────────

export const broadcastInput = z.object({
  channelId: z.string().min(1).max(255),
  event: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
  excludeSelf: z.boolean().default(false),
})

export const sendMessageInput = z.object({
  channelId: z.string().min(1).max(255),
  event: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
  targetUserId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Presence Validators
// ─────────────────────────────────────────────────────────────────────────────

export const updatePresenceInput = z.object({
  channelId: z.string().min(1).max(255),
  status: z.enum(["online", "away", "busy", "offline"]).default("online"),
  metadata: z.record(z.unknown()).optional(),
})

export const getPresenceInput = z.object({
  channelId: z.string().min(1).max(255),
})

export const trackPresenceInput = z.object({
  channelId: z.string().min(1).max(255),
  userId: z.string().uuid(),
  status: z.enum(["online", "away", "busy", "offline"]).default("online"),
  metadata: z.record(z.unknown()).optional(),
})

export const untrackPresenceInput = z.object({
  channelId: z.string().min(1).max(255),
  userId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Message Validators
// ─────────────────────────────────────────────────────────────────────────────

export const wsMessageInput = z.object({
  type: z.enum(["subscribe", "unsubscribe", "broadcast", "presence", "ping"]),
  channelId: z.string().min(1).max(255).optional(),
  event: z.string().min(1).max(100).optional(),
  payload: z.record(z.unknown()).optional(),
})

export const wsAuthInput = z.object({
  token: z.string().min(1),
  tenantId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type JoinChannelInput = z.infer<typeof joinChannelInput>
export type LeaveChannelInput = z.infer<typeof leaveChannelInput>
export type CreateChannelInput = z.infer<typeof createChannelInput>
export type GetChannelInput = z.infer<typeof getChannelInput>
export type ListChannelsInput = z.infer<typeof listChannelsInput>
export type BroadcastInput = z.infer<typeof broadcastInput>
export type SendMessageInput = z.infer<typeof sendMessageInput>
export type UpdatePresenceInput = z.infer<typeof updatePresenceInput>
export type GetPresenceInput = z.infer<typeof getPresenceInput>
export type TrackPresenceInput = z.infer<typeof trackPresenceInput>
export type UntrackPresenceInput = z.infer<typeof untrackPresenceInput>
export type WsMessageInput = z.infer<typeof wsMessageInput>
export type WsAuthInput = z.infer<typeof wsAuthInput>
