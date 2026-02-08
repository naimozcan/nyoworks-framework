// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
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
import { RealtimeService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface RealtimeContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
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
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.createChannel(input)
    }),

  get: protectedProcedure
    .input(getChannelInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.getChannel(input.channelId)
    }),

  list: protectedProcedure
    .input(listChannelsInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.listChannels(input)
    }),

  join: protectedProcedure
    .input(joinChannelInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.joinChannel(ctx.user.id, input)
    }),

  leave: protectedProcedure
    .input(leaveChannelInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.leaveChannel(ctx.user.id, input.channelId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Presence Router
// ─────────────────────────────────────────────────────────────────────────────

const presenceRouter = t.router({
  update: protectedProcedure
    .input(updatePresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.updatePresence(ctx.user.id, input)
    }),

  get: protectedProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.getPresence(input.channelId)
    }),

  track: protectedProcedure
    .input(trackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.trackPresence(input)
    }),

  untrack: protectedProcedure
    .input(untrackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.untrackPresence(input.channelId, input.userId)
    }),

  heartbeat: protectedProcedure
    .input(getPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.heartbeat(input.channelId, ctx.user.id)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Router
// ─────────────────────────────────────────────────────────────────────────────

const broadcastRouter = t.router({
  send: protectedProcedure
    .input(broadcastInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.sendBroadcast(ctx.user.id, input)
    }),

  history: protectedProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId, ctx.broadcast)
      return service.getHistory(input.channelId)
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
