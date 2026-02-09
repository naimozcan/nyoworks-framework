// ═══════════════════════════════════════════════════════════════════════════════
// AI Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Chat Validators
// ─────────────────────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(10000),
  context: z.object({
    appType: z.string().optional(),
    pageContext: z.string().optional(),
    userLanguage: z.string().default("nl"),
    customData: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
})

export const startConversationSchema = z.object({
  sessionId: z.string().optional(),
  systemPromptId: z.string().optional(),
  context: z.object({
    appType: z.string().optional(),
    pageContext: z.string().optional(),
    userLanguage: z.string().default("nl"),
    customData: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type StartConversationInput = z.infer<typeof startConversationSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Content Generation Validators
// ─────────────────────────────────────────────────────────────────────────────

export const generateContentSchema = z.object({
  type: z.enum(["product_description", "blog_post", "email", "social_media", "custom"]),
  prompt: z.string().min(1),
  tone: z.enum(["professional", "casual", "friendly", "formal"]).default("professional"),
  language: z.string().default("nl"),
  maxLength: z.number().min(50).max(5000).default(500),
  context: z.record(z.string(), z.unknown()).optional(),
})

export const summarizeTextSchema = z.object({
  text: z.string().min(1),
  maxLength: z.number().min(50).max(1000).default(200),
  language: z.string().default("nl"),
})

export type GenerateContentInput = z.infer<typeof generateContentSchema>
export type SummarizeTextInput = z.infer<typeof summarizeTextSchema>

// ─────────────────────────────────────────────────────────────────────────────
// OCR/Document Validators
// ─────────────────────────────────────────────────────────────────────────────

export const processDocumentSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  documentType: z.enum(["invoice", "receipt", "id_card", "general"]).default("general"),
  extractFields: z.array(z.string()).optional(),
})

export type ProcessDocumentInput = z.infer<typeof processDocumentSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Management Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createPromptSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["chatbot", "content", "support", "sales", "custom"]),
  systemPrompt: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export type CreatePromptInput = z.infer<typeof createPromptSchema>
