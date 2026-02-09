// ═══════════════════════════════════════════════════════════════════════════════
// Messaging Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Validators
// ─────────────────────────────────────────────────────────────────────────────

export const conversationTypeSchema = z.enum(["direct", "group", "support", "channel"])

export const createConversationSchema = z.object({
  type: conversationTypeSchema.default("direct"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateConversationSchema = z.object({
  conversationId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  isArchived: z.boolean().optional(),
})

export const getConversationSchema = z.object({
  conversationId: z.string().uuid(),
})

export const listConversationsSchema = z.object({
  type: conversationTypeSchema.optional(),
  isArchived: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Message Validators
// ─────────────────────────────────────────────────────────────────────────────

export const messageContentTypeSchema = z.enum(["text", "image", "file", "audio", "video", "location", "system"])

export const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "file", "audio", "video", "location"]),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000).optional(),
  contentType: messageContentTypeSchema.default("text"),
  replyToId: z.string().uuid().optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(10000),
})

export const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
})

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  before: z.string().uuid().optional(),
  after: z.string().uuid().optional(),
})

export const markAsReadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
})

export const addReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
})

export const removeReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
})

// ─────────────────────────────────────────────────────────────────────────────
// Participant Validators
// ─────────────────────────────────────────────────────────────────────────────

export const participantRoleSchema = z.enum(["owner", "admin", "member", "guest"])

export const addParticipantSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: participantRoleSchema.default("member"),
})

export const removeParticipantSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
})

export const updateParticipantSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: participantRoleSchema.optional(),
  nickname: z.string().max(50).optional(),
  isMuted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Support/Live Chat Validators
// ─────────────────────────────────────────────────────────────────────────────

export const supportStatusSchema = z.enum(["waiting", "assigned", "in_progress", "resolved", "closed"])

export const startSupportChatSchema = z.object({
  visitorId: z.string().optional(),
  visitorName: z.string().min(1).max(100).optional(),
  visitorEmail: z.string().email().optional(),
  category: z.string().max(50).optional(),
  initialMessage: z.string().min(1).max(2000),
  pageUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const assignAgentSchema = z.object({
  conversationId: z.string().uuid(),
  agentId: z.string().uuid(),
})

export const updateSupportStatusSchema = z.object({
  conversationId: z.string().uuid(),
  status: supportStatusSchema,
  resolution: z.string().max(1000).optional(),
})

export const rateSupportSchema = z.object({
  conversationId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
})

export const listSupportChatsSchema = z.object({
  status: supportStatusSchema.optional(),
  agentId: z.string().uuid().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Canned Response Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createCannedResponseSchema = z.object({
  shortcut: z.string().min(1).max(20).regex(/^[a-z0-9_]+$/),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  category: z.string().max(50).optional(),
  language: z.string().length(2).default("nl"),
})

export const updateCannedResponseSchema = z.object({
  id: z.string().uuid(),
  shortcut: z.string().min(1).max(20).regex(/^[a-z0-9_]+$/).optional(),
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
})

export const listCannedResponsesSchema = z.object({
  category: z.string().optional(),
  language: z.string().length(2).optional(),
  search: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Agent Availability Validators
// ─────────────────────────────────────────────────────────────────────────────

export const agentStatusSchema = z.enum(["online", "away", "busy", "offline"])

export const updateAgentStatusSchema = z.object({
  status: agentStatusSchema,
  maxConcurrentChats: z.number().min(1).max(20).optional(),
})

export const listAvailableAgentsSchema = z.object({
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicator Validators
// ─────────────────────────────────────────────────────────────────────────────

export const typingIndicatorSchema = z.object({
  conversationId: z.string().uuid(),
  isTyping: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationType = z.infer<typeof conversationTypeSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
export type GetMessagesInput = z.infer<typeof getMessagesSchema>
export type ParticipantRole = z.infer<typeof participantRoleSchema>
export type SupportStatus = z.infer<typeof supportStatusSchema>
export type StartSupportChatInput = z.infer<typeof startSupportChatSchema>
export type AgentStatus = z.infer<typeof agentStatusSchema>
export type Attachment = z.infer<typeof attachmentSchema>
