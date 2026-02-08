// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { TIMEOUTS, DEFAULTS } from "@nyoworks/shared"
import { ChannelsRepository, PresenceRepository, MessagesRepository } from "../repositories/index.js"
import type { Channel, PresenceRecord, Message } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateChannelInput {
  name: string
  type?: string
  metadata?: Record<string, unknown>
}

interface ListChannelsInput {
  limit: number
  offset: number
  type?: string
}

interface JoinChannelInput {
  channelId: string
  metadata?: Record<string, unknown>
}

interface UpdatePresenceInput {
  channelId: string
  status: string
  metadata?: Record<string, unknown>
}

interface TrackPresenceInput {
  channelId: string
  userId: string
  status: string
  metadata?: Record<string, unknown>
}

interface BroadcastInput {
  channelId: string
  event: string
  payload?: Record<string, unknown>
  excludeSelf?: boolean
}

type BroadcastFn = (channelId: string, event: string, payload: unknown, excludeUserId?: string) => void

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class RealtimeService {
  private readonly channelsRepo: ChannelsRepository
  private readonly presenceRepo: PresenceRepository
  private readonly messagesRepo: MessagesRepository

  constructor(
    db: DrizzleDatabase,
    tenantId: string,
    private readonly broadcast?: BroadcastFn
  ) {
    this.channelsRepo = new ChannelsRepository(db, tenantId)
    this.presenceRepo = new PresenceRepository(db)
    this.messagesRepo = new MessagesRepository(db)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Channels
  // ─────────────────────────────────────────────────────────────────────────────

  async createChannel(input: CreateChannelInput): Promise<Channel> {
    return this.channelsRepo.create({
      name: input.name,
      type: input.type ?? "public",
      metadata: input.metadata,
    })
  }

  async getChannel(channelId: string): Promise<Channel> {
    const channel = await this.channelsRepo.findById(channelId)

    if (!channel) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" })
    }

    return channel
  }

  async listChannels(input: ListChannelsInput) {
    const result = await this.channelsRepo.list(input)

    return {
      items: result.items,
      total: result.total,
    }
  }

  async joinChannel(userId: string, input: JoinChannelInput): Promise<PresenceRecord> {
    await this.presenceRepo.delete(input.channelId, userId)

    const presence = await this.presenceRepo.create({
      channelId: input.channelId,
      userId,
      status: "online",
      metadata: input.metadata,
    })

    if (this.broadcast) {
      this.broadcast(input.channelId, "user:joined", {
        userId,
        metadata: input.metadata,
      })
    }

    return presence
  }

  async leaveChannel(userId: string, channelId: string): Promise<{ success: boolean }> {
    await this.presenceRepo.delete(channelId, userId)

    if (this.broadcast) {
      this.broadcast(channelId, "user:left", { userId })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Presence
  // ─────────────────────────────────────────────────────────────────────────────

  async updatePresence(userId: string, input: UpdatePresenceInput): Promise<PresenceRecord> {
    const presence = await this.presenceRepo.update(input.channelId, userId, {
      status: input.status,
      metadata: input.metadata,
    })

    if (!presence) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Presence record not found" })
    }

    if (this.broadcast) {
      this.broadcast(input.channelId, "presence:updated", {
        userId,
        status: input.status,
        metadata: input.metadata,
      })
    }

    return presence
  }

  async getPresence(channelId: string): Promise<{ members: PresenceRecord[] }> {
    const staleThreshold = new Date(Date.now() - TIMEOUTS.PRESENCE_STALE)
    const members = await this.presenceRepo.findByChannel(channelId, staleThreshold)

    return { members }
  }

  async trackPresence(input: TrackPresenceInput): Promise<PresenceRecord> {
    return this.presenceRepo.upsert(input.channelId, input.userId, {
      status: input.status,
      metadata: input.metadata,
    })
  }

  async untrackPresence(channelId: string, userId: string): Promise<{ success: boolean }> {
    await this.presenceRepo.delete(channelId, userId)
    return { success: true }
  }

  async heartbeat(channelId: string, userId: string): Promise<{ success: boolean }> {
    await this.presenceRepo.heartbeat(channelId, userId)
    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Broadcast
  // ─────────────────────────────────────────────────────────────────────────────

  async sendBroadcast(userId: string, input: BroadcastInput): Promise<Message> {
    const message = await this.messagesRepo.create({
      channelId: input.channelId,
      userId,
      event: input.event,
      payload: input.payload,
    })

    if (this.broadcast) {
      const excludeUserId = input.excludeSelf ? userId : undefined
      this.broadcast(input.channelId, input.event, input.payload, excludeUserId)
    }

    return message
  }

  async getHistory(channelId: string): Promise<{ items: Message[] }> {
    const items = await this.messagesRepo.findByChannel(channelId, { limit: DEFAULTS.HISTORY_LIMIT })
    return { items }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { RealtimeService }
export type {
  CreateChannelInput,
  ListChannelsInput,
  JoinChannelInput,
  UpdatePresenceInput,
  TrackPresenceInput,
  BroadcastInput,
  BroadcastFn,
}
