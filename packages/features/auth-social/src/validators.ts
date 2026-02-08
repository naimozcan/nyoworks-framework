// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Provider Enum
// ─────────────────────────────────────────────────────────────────────────────

export const socialProvider = z.enum(["google", "apple", "github"])

// ─────────────────────────────────────────────────────────────────────────────
// Link Account
// ─────────────────────────────────────────────────────────────────────────────

export const linkAccountInput = z.object({
  provider: socialProvider,
  code: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().optional(),
})

export const linkAccountOutput = z.object({
  id: z.string().uuid(),
  provider: socialProvider,
  providerAccountId: z.string(),
  profile: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    picture: z.string().url().optional(),
  }).passthrough().nullable(),
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Unlink Account
// ─────────────────────────────────────────────────────────────────────────────

export const unlinkAccountInput = z.object({
  provider: socialProvider,
})

export const unlinkAccountOutput = z.object({
  success: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get Linked Accounts
// ─────────────────────────────────────────────────────────────────────────────

export const getLinkedAccountsInput = z.object({}).optional()

export const linkedAccountOutput = z.object({
  id: z.string().uuid(),
  provider: socialProvider,
  providerAccountId: z.string(),
  profile: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    picture: z.string().url().optional(),
  }).passthrough().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const getLinkedAccountsOutput = z.array(linkedAccountOutput)

// ─────────────────────────────────────────────────────────────────────────────
// OAuth URL
// ─────────────────────────────────────────────────────────────────────────────

export const getOAuthUrlInput = z.object({
  provider: socialProvider,
  redirectUri: z.string().url(),
  state: z.string().optional(),
})

export const getOAuthUrlOutput = z.object({
  url: z.string().url(),
  state: z.string(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Social Login
// ─────────────────────────────────────────────────────────────────────────────

export const socialLoginInput = z.object({
  provider: socialProvider,
  code: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().optional(),
})

export const socialLoginOutput = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
    picture: z.string().url().optional(),
  }),
  isNewUser: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SocialProviderType = z.infer<typeof socialProvider>
export type LinkAccountInput = z.infer<typeof linkAccountInput>
export type LinkAccountOutput = z.infer<typeof linkAccountOutput>
export type UnlinkAccountInput = z.infer<typeof unlinkAccountInput>
export type UnlinkAccountOutput = z.infer<typeof unlinkAccountOutput>
export type GetLinkedAccountsOutput = z.infer<typeof getLinkedAccountsOutput>
export type LinkedAccountOutput = z.infer<typeof linkedAccountOutput>
export type GetOAuthUrlInput = z.infer<typeof getOAuthUrlInput>
export type GetOAuthUrlOutput = z.infer<typeof getOAuthUrlOutput>
export type SocialLoginInput = z.infer<typeof socialLoginInput>
export type SocialLoginOutput = z.infer<typeof socialLoginOutput>
