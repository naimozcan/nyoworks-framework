// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, desc, sql, gt } from "drizzle-orm"
import {
  joinChannelInput,
  leaveChannelInput,
  createChannelInput,
  getChannelInput,
  listChannelsInput,
  broadcastInput,
  updatePresenceInput,
  getPresenceInput,
  trackPresenceInput,
  untrackPresenceInput,
} from "./validators.js"
import { presenceRecords, channels, messages } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface RealtimeContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
  broadcast?: (channelId: string, event: string, payload: unknown, excludeUserId?: string) => void
}

const t = initTRPC.context<RealtimeContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Channels Router
// ─────────────────────────────────────────────────────────────────────────────

const channelsRouter = t.router({
  create: protectedProcedure
    .input(createChannelInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [channel] = await db
        .insert(channels)
        .values({
          name: input.name,
          type: input.type,
          tenantId: ctx.tenantId,
          metadata: input.metadata,
        })
        .returning()

      return channel
    }),

  get: protectedProcedure
    .input(getChannelInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, input.channelId), eq(channels.tenantId, ctx.tenantId)))
        .limit(1)

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" })
      }

      return channel
    }),

  list: protectedProcedure
    .input(listChannelsInput)
    .query(async ({ input, ctx }) => {
      const { type, limit, offset } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(channels)
        .where(eq(channels.tenantId, ctx.tenantId))

      if (type) {
        query = query.where(eq(channels.type, type))
      }

      const items = await query
        .orderBy(desc(channels.createdAt))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(channels)
        .where(eq(channels.tenantId, ctx.tenantId))

      return {
        items,
        total: countResult[0]?.count || 0,
      }
    }),

  join: protectedProcedure
    .input(joinChannelInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .delete(presenceRecords)
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, ctx.user.id)
          )
        )

      const [presence] = await db
        .insert(presenceRecords)
        .values({
          channelId: input.channelId,
          userId: ctx.user.id,
          status: "online",
          metadata: input.metadata,
        })
        .returning()

      if (ctx.broadcast) {
        ctx.broadcast(input.channelId, "user:joined", {
          userId: ctx.user.id,
          metadata: input.metadata,
        })
      }

      return presence
    }),

  leave: protectedProcedure
    .input(leaveChannelInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .delete(presenceRecords)
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, ctx.user.id)
          )
        )

      if (ctx.broadcast) {
        ctx.broadcast(input.channelId, "user:left", {
          userId: ctx.user.id,
        })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Presence Router
// ─────────────────────────────────────────────────────────────────────────────

const presenceRouter = t.router({
  update: protectedProcedure
    .input(updatePresenceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [presence] = await db
        .update(presenceRecords)
        .set({
          status: input.status,
          metadata: input.metadata,
          lastSeenAt: new Date(),
        })
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, ctx.user.id)
          )
        )
        .returning()

      if (!presence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Presence record not found" })
      }

      if (ctx.broadcast) {
        ctx.broadcast(input.channelId, "presence:updated", {
          userId: ctx.user.id,
          status: input.status,
          metadata: input.metadata,
        })
      }

      return presence
    }),

  get: protectedProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000)

      const records = await db
        .select()
        .from(presenceRecords)
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            gt(presenceRecords.lastSeenAt, staleThreshold)
          )
        )

      return { members: records }
    }),

  track: protectedProcedure
    .input(trackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [existing] = await db
        .select()
        .from(presenceRecords)
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, input.userId)
          )
        )
        .limit(1)

      if (existing) {
        const [updated] = await db
          .update(presenceRecords)
          .set({
            status: input.status,
            metadata: input.metadata,
            lastSeenAt: new Date(),
          })
          .where(eq(presenceRecords.id, existing.id))
          .returning()

        return updated
      }

      const [created] = await db
        .insert(presenceRecords)
        .values({
          channelId: input.channelId,
          userId: input.userId,
          status: input.status,
          metadata: input.metadata,
        })
        .returning()

      return created
    }),

  untrack: protectedProcedure
    .input(untrackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .delete(presenceRecords)
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, input.userId)
          )
        )

      return { success: true }
    }),

  heartbeat: protectedProcedure
    .input(getPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .update(presenceRecords)
        .set({ lastSeenAt: new Date() })
        .where(
          and(
            eq(presenceRecords.channelId, input.channelId),
            eq(presenceRecords.userId, ctx.user.id)
          )
        )

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Router
// ─────────────────────────────────────────────────────────────────────────────

const broadcastRouter = t.router({
  send: protectedProcedure
    .input(broadcastInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [message] = await db
        .insert(messages)
        .values({
          channelId: input.channelId,
          userId: ctx.user.id,
          event: input.event,
          payload: input.payload,
        })
        .returning()

      if (ctx.broadcast) {
        const excludeUserId = input.excludeSelf ? ctx.user.id : undefined
        ctx.broadcast(input.channelId, input.event, input.payload, excludeUserId)
      }

      return message
    }),

  history: protectedProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const items = await db
        .select()
        .from(messages)
        .where(eq(messages.channelId, input.channelId))
        .orderBy(desc(messages.createdAt))
        .limit(100)

      return { items }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const realtimeRouter = t.router({
  channels: channelsRouter,
  presence: presenceRouter,
  broadcast: broadcastRouter,
})

export type RealtimeRouter = typeof realtimeRouter
