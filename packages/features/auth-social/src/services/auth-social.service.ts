// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { SocialAccountsRepository } from "../repositories/index.js"
import type { SocialProfile, SocialProviderType } from "../schema.js"
import {
  generateAuthUrl,
  generateState,
  exchangeCodeForTokens,
  fetchUserProfile,
  revokeAccessToken,
} from "../providers.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OAuthUrlInput {
  provider: SocialProviderType
  redirectUri: string
  state?: string
}

interface SocialLoginInput {
  provider: SocialProviderType
  code: string
  redirectUri: string
}

interface LinkAccountInput {
  provider: SocialProviderType
  code: string
  redirectUri: string
}

interface LinkedAccountInfo {
  id: string
  provider: string
  providerAccountId: string
  profile: SocialProfile | null
  createdAt: Date
  updatedAt: Date
}

interface LoginResult {
  accessToken: string
  refreshToken?: string
  user: {
    id: string
    email: string
    name?: string
    picture?: string
  }
  isNewUser: boolean
}

type CreateSessionFn = (userId: string) => Promise<{ accessToken: string; refreshToken?: string }>
type FindOrCreateUserFn = (profile: { email: string; name?: string; picture?: string }) => Promise<{ id: string; email: string; isNew: boolean }>

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class AuthSocialService {
  private readonly repository: SocialAccountsRepository

  constructor(
    db: DrizzleDatabase,
    private readonly createSession?: CreateSessionFn,
    private readonly findOrCreateUser?: FindOrCreateUserFn
  ) {
    this.repository = new SocialAccountsRepository(db)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OAuth URL
  // ─────────────────────────────────────────────────────────────────────────────

  getOAuthUrl(input: OAuthUrlInput): { url: string; state: string } {
    const state = input.state || generateState()
    const url = generateAuthUrl(input.provider, input.redirectUri, state)

    return { url, state }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────────────────────

  async login(input: SocialLoginInput): Promise<LoginResult> {
    if (!this.findOrCreateUser || !this.createSession) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Auth handlers not configured",
      })
    }

    const tokens = await exchangeCodeForTokens(input.provider, input.code, input.redirectUri)

    const { providerAccountId, profile } = await fetchUserProfile(
      input.provider,
      tokens.access_token,
      tokens.id_token
    )

    const existingAccount = await this.repository.findByProviderAndAccountId(input.provider, providerAccountId)

    let userId: string
    let isNewUser = false

    if (existingAccount) {
      userId = existingAccount.userId

      await this.repository.updateTokens(existingAccount.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existingAccount.refreshToken,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        profile,
      })
    } else {
      if (!profile.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is required for social login",
        })
      }

      const user = await this.findOrCreateUser({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      })

      userId = user.id
      isNewUser = user.isNew

      await this.repository.create({
        userId,
        provider: input.provider,
        providerAccountId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        profile,
      })
    }

    const session = await this.createSession(userId)

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: userId,
        email: profile.email || "",
        name: profile.name,
        picture: profile.picture,
      },
      isNewUser,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Link Account
  // ─────────────────────────────────────────────────────────────────────────────

  async linkAccount(userId: string, input: LinkAccountInput): Promise<LinkedAccountInfo> {
    const existingLink = await this.repository.findByUserAndProvider(userId, input.provider)

    if (existingLink) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Account already linked with ${input.provider}`,
      })
    }

    const tokens = await exchangeCodeForTokens(input.provider, input.code, input.redirectUri)

    const { providerAccountId, profile } = await fetchUserProfile(
      input.provider,
      tokens.access_token,
      tokens.id_token
    )

    const existingAccount = await this.repository.findByProviderAndAccountId(input.provider, providerAccountId)

    if (existingAccount) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This social account is already linked to another user",
      })
    }

    const account = await this.repository.create({
      userId,
      provider: input.provider,
      providerAccountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      profile,
    })

    return {
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      profile: account.profile,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Unlink Account
  // ─────────────────────────────────────────────────────────────────────────────

  async unlinkAccount(userId: string, provider: SocialProviderType): Promise<{ success: boolean }> {
    const account = await this.repository.findByUserAndProvider(userId, provider)

    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `No ${provider} account linked`,
      })
    }

    if (account.accessToken) {
      try {
        await revokeAccessToken(provider, account.accessToken)
      } catch {
      }
    }

    await this.repository.delete(account.id)

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Get Linked Accounts
  // ─────────────────────────────────────────────────────────────────────────────

  async getLinkedAccounts(userId: string): Promise<LinkedAccountInfo[]> {
    const accounts = await this.repository.findByUser(userId)

    return accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      profile: account.profile,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { AuthSocialService }
export type {
  OAuthUrlInput,
  SocialLoginInput,
  LinkAccountInput,
  LinkedAccountInfo,
  LoginResult,
  CreateSessionFn,
  FindOrCreateUserFn,
}
