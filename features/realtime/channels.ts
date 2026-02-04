// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Channels
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Channel Types
// ─────────────────────────────────────────────────────────────────────────────

export const RealtimeChannels = {
  NOTIFICATIONS: "notifications",
  CHAT: "chat",
  UPDATES: "updates",
  PRESENCE: "presence",
} as const

export type RealtimeChannel = (typeof RealtimeChannels)[keyof typeof RealtimeChannels]

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export const RealtimeEvents = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  MESSAGE: "message",
  TYPING: "typing",
  PRESENCE_UPDATE: "presence:update",
  NOTIFICATION: "notification",
  ENTITY_CREATED: "entity:created",
  ENTITY_UPDATED: "entity:updated",
  ENTITY_DELETED: "entity:deleted",
} as const

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents]

// ─────────────────────────────────────────────────────────────────────────────
// Message Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RealtimeMessage<T = unknown> {
  channel: RealtimeChannel
  event: RealtimeEvent
  data: T
  timestamp: number
  sender?: {
    id: string
    name: string
  }
}

export interface PresenceData {
  userId: string
  status: "online" | "away" | "offline"
  lastSeen?: number
}

export interface TypingData {
  userId: string
  channelId: string
  isTyping: boolean
}
