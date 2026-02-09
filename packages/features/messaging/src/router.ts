// ═══════════════════════════════════════════════════════════════════════════════
// Messaging Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import {
  createConversationSchema,
  updateConversationSchema,
  getConversationSchema,
  listConversationsSchema,
  sendMessageSchema,
  updateMessageSchema,
  deleteMessageSchema,
  getMessagesSchema,
  markAsReadSchema,
  addReactionSchema,
  addParticipantSchema,
  removeParticipantSchema,
  updateParticipantSchema,
  startSupportChatSchema,
  assignAgentSchema,
  updateSupportStatusSchema,
  rateSupportSchema,
  listSupportChatsSchema,
  createCannedResponseSchema,
  updateCannedResponseSchema,
  listCannedResponsesSchema,
  updateAgentStatusSchema,
  listAvailableAgentsSchema,
  typingIndicatorSchema,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrpcProcedure {
  input: (schema: z.ZodTypeAny) => {
    mutation: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
    query: (handler: (opts: { input: unknown; ctx: unknown }) => Promise<unknown>) => unknown
  }
  query: (handler: (opts: { ctx: unknown }) => Promise<unknown>) => unknown
  mutation: (handler: (opts: { ctx: unknown }) => Promise<unknown>) => unknown
}

interface TrpcInstance {
  router: (routes: Record<string, unknown>) => unknown
  protectedProcedure: TrpcProcedure
  publicProcedure: TrpcProcedure
}

// ─────────────────────────────────────────────────────────────────────────────
// Router Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createMessagingRouter(trpc: TrpcInstance) {
  return trpc.router({
    // ─────────────────────────────────────────────────────────────────────────
    // Conversations
    // ─────────────────────────────────────────────────────────────────────────

    conversations: trpc.router({
      create: trpc.protectedProcedure
        .input(createConversationSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true, conversationId: "placeholder" }
        }),

      get: trpc.protectedProcedure
        .input(getConversationSchema)
        .query(async ({ input: _input }) => {
          return null
        }),

      list: trpc.protectedProcedure
        .input(listConversationsSchema)
        .query(async ({ input: _input }) => {
          return { conversations: [], nextCursor: null }
        }),

      update: trpc.protectedProcedure
        .input(updateConversationSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      archive: trpc.protectedProcedure
        .input(getConversationSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      getOrCreateDirect: trpc.protectedProcedure
        .input(z.object({ userId: z.string().uuid() }))
        .mutation(async ({ input: _input }) => {
          return { conversationId: "placeholder", isNew: false }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Messages
    // ─────────────────────────────────────────────────────────────────────────

    messages: trpc.router({
      send: trpc.protectedProcedure
        .input(sendMessageSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true, messageId: "placeholder" }
        }),

      get: trpc.protectedProcedure
        .input(getMessagesSchema)
        .query(async ({ input: _input }) => {
          return { messages: [], hasMore: false }
        }),

      update: trpc.protectedProcedure
        .input(updateMessageSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      delete: trpc.protectedProcedure
        .input(deleteMessageSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      markAsRead: trpc.protectedProcedure
        .input(markAsReadSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      addReaction: trpc.protectedProcedure
        .input(addReactionSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      removeReaction: trpc.protectedProcedure
        .input(addReactionSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      search: trpc.protectedProcedure
        .input(z.object({
          query: z.string().min(1),
          conversationId: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
        }))
        .query(async ({ input: _input }) => {
          return { messages: [], total: 0 }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Participants
    // ─────────────────────────────────────────────────────────────────────────

    participants: trpc.router({
      add: trpc.protectedProcedure
        .input(addParticipantSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      remove: trpc.protectedProcedure
        .input(removeParticipantSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      update: trpc.protectedProcedure
        .input(updateParticipantSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      list: trpc.protectedProcedure
        .input(z.object({ conversationId: z.string().uuid() }))
        .query(async ({ input: _input }) => {
          return { participants: [] }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Support / Live Chat
    // ─────────────────────────────────────────────────────────────────────────

    support: trpc.router({
      startChat: trpc.publicProcedure
        .input(startSupportChatSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true, conversationId: "placeholder", queuePosition: 1 }
        }),

      assignAgent: trpc.protectedProcedure
        .input(assignAgentSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      updateStatus: trpc.protectedProcedure
        .input(updateSupportStatusSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      rate: trpc.publicProcedure
        .input(rateSupportSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      list: trpc.protectedProcedure
        .input(listSupportChatsSchema)
        .query(async ({ input: _input }) => {
          return { chats: [], nextCursor: null }
        }),

      getQueue: trpc.protectedProcedure
        .query(async () => {
          return { queue: [], totalWaiting: 0 }
        }),

      getStats: trpc.protectedProcedure
        .input(z.object({
          from: z.date().optional(),
          to: z.date().optional(),
        }))
        .query(async ({ input: _input }) => {
          return {
            totalChats: 0,
            avgResponseTime: 0,
            avgResolutionTime: 0,
            avgRating: 0,
            resolvedCount: 0,
          }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Canned Responses
    // ─────────────────────────────────────────────────────────────────────────

    cannedResponses: trpc.router({
      create: trpc.protectedProcedure
        .input(createCannedResponseSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true, id: "placeholder" }
        }),

      update: trpc.protectedProcedure
        .input(updateCannedResponseSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      delete: trpc.protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      list: trpc.protectedProcedure
        .input(listCannedResponsesSchema)
        .query(async ({ input: _input }) => {
          return { responses: [] }
        }),

      getByShortcut: trpc.protectedProcedure
        .input(z.object({ shortcut: z.string() }))
        .query(async ({ input: _input }) => {
          return null
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Agent Management
    // ─────────────────────────────────────────────────────────────────────────

    agents: trpc.router({
      updateStatus: trpc.protectedProcedure
        .input(updateAgentStatusSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),

      getAvailable: trpc.protectedProcedure
        .input(listAvailableAgentsSchema)
        .query(async ({ input: _input }) => {
          return { agents: [] }
        }),

      getMyStatus: trpc.protectedProcedure
        .query(async () => {
          return { status: "offline", currentChatCount: 0, maxConcurrentChats: 5 }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Typing Indicators
    // ─────────────────────────────────────────────────────────────────────────

    typing: trpc.router({
      send: trpc.protectedProcedure
        .input(typingIndicatorSchema)
        .mutation(async ({ input: _input }) => {
          return { success: true }
        }),
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // Unread Counts
    // ─────────────────────────────────────────────────────────────────────────

    unread: trpc.router({
      getTotal: trpc.protectedProcedure
        .query(async () => {
          return { total: 0 }
        }),

      getByConversation: trpc.protectedProcedure
        .query(async () => {
          return { counts: {} as Record<string, number> }
        }),
    }),
  })
}
