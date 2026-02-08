// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
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
// Channels Router
// ─────────────────────────────────────────────────────────────────────────────

const channelsRouter = router({
  create: tenantProcedure
    .input(createChannelInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.createChannel(input)
    }),

  get: tenantProcedure
    .input(getChannelInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.getChannel(input.channelId)
    }),

  list: tenantProcedure
    .input(listChannelsInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.listChannels(input)
    }),

  join: tenantProcedure
    .input(joinChannelInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.joinChannel(ctx.user.id, input)
    }),

  leave: tenantProcedure
    .input(leaveChannelInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.leaveChannel(ctx.user.id, input.channelId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Presence Router
// ─────────────────────────────────────────────────────────────────────────────

const presenceRouter = router({
  update: tenantProcedure
    .input(updatePresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.updatePresence(ctx.user.id, input)
    }),

  get: tenantProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.getPresence(input.channelId)
    }),

  track: tenantProcedure
    .input(trackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.trackPresence(input)
    }),

  untrack: tenantProcedure
    .input(untrackPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.untrackPresence(input.channelId, input.userId)
    }),

  heartbeat: tenantProcedure
    .input(getPresenceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.heartbeat(input.channelId, ctx.user.id)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Router
// ─────────────────────────────────────────────────────────────────────────────

const broadcastRouter = router({
  send: tenantProcedure
    .input(broadcastInput)
    .mutation(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.sendBroadcast(ctx.user.id, input)
    }),

  history: tenantProcedure
    .input(getPresenceInput)
    .query(async ({ input, ctx }) => {
      const service = new RealtimeService(ctx.db, ctx.tenantId)
      return service.getHistory(input.channelId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const realtimeRouter = router({
  channels: channelsRouter,
  presence: presenceRouter,
  broadcast: broadcastRouter,
})

export type RealtimeRouter = typeof realtimeRouter
