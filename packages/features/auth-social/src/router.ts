// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import type { PgDatabase } from "drizzle-orm/pg-core"
import {
  linkAccountInput,
  unlinkAccountInput,
  getOAuthUrlInput,
  socialLoginInput,
} from "./validators.js"
import { socialAccounts, type SocialAccount } from "./schema.js"
import {
  generateAuthUrl,
  generateState,
  exchangeCodeForTokens,
  fetchUserProfile,
  revokeAccessToken,
} from "./providers.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = PgDatabase<any, any, any>

interface AuthSocialContext {
  user?: { id: string; email: string }
  db: DrizzleDB
  createSession?: (userId: string) => Promise<{ accessToken: string; refreshToken?: string }>
  findOrCreateUser?: (profile: { email: string; name?: string; picture?: string }) => Promise<{ id: string; email: string; isNew: boolean }>
}

const t = initTRPC.context<AuthSocialContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const authSocialRouter = t.router({
  getOAuthUrl: t.procedure
    .input(getOAuthUrlInput)
    .query(({ input }) => {
      const state = input.state || generateState()
      const url = generateAuthUrl(input.provider, input.redirectUri, state)

      return { url, state }
    }),

  login: t.procedure
    .input(socialLoginInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.findOrCreateUser || !ctx.createSession) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Auth handlers not configured",
        })
      }

      const db = ctx.db

      const tokens = await exchangeCodeForTokens(
        input.provider,
        input.code,
        input.redirectUri
      )

      const { providerAccountId, profile } = await fetchUserProfile(
        input.provider,
        tokens.access_token,
        tokens.id_token
      )

      const existingAccount = await db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.provider, input.provider),
            eq(socialAccounts.providerAccountId, providerAccountId)
          )
        )
        .limit(1) as SocialAccount[]

      let userId: string
      let isNewUser = false

      if (existingAccount[0]) {
        userId = existingAccount[0].userId

        await db
          .update(socialAccounts)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existingAccount[0].refreshToken,
            expiresAt: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
            profile,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existingAccount[0].id))
      } else {
        if (!profile.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email is required for social login",
          })
        }

        const user = await ctx.findOrCreateUser({
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        })

        userId = user.id
        isNewUser = user.isNew

        await db.insert(socialAccounts).values({
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

      const session = await ctx.createSession(userId)

      const userResult = await db
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.userId, userId))
        .limit(1) as SocialAccount[]

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: {
          id: userId,
          email: profile.email || userResult[0]?.profile?.email || "",
          name: profile.name,
          picture: profile.picture,
        },
        isNewUser,
      }
    }),

  link: protectedProcedure
    .input(linkAccountInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const existingLink = await db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.userId, ctx.user.id),
            eq(socialAccounts.provider, input.provider)
          )
        )
        .limit(1) as SocialAccount[]

      if (existingLink[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Account already linked with ${input.provider}`,
        })
      }

      const tokens = await exchangeCodeForTokens(
        input.provider,
        input.code,
        input.redirectUri
      )

      const { providerAccountId, profile } = await fetchUserProfile(
        input.provider,
        tokens.access_token,
        tokens.id_token
      )

      const existingAccount = await db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.provider, input.provider),
            eq(socialAccounts.providerAccountId, providerAccountId)
          )
        )
        .limit(1) as SocialAccount[]

      if (existingAccount[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This social account is already linked to another user",
        })
      }

      const result = await db
        .insert(socialAccounts)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          providerAccountId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          profile,
        })
        .returning() as SocialAccount[]

      const account = result[0]!

      return {
        id: account.id,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        profile: account.profile,
        createdAt: account.createdAt,
      }
    }),

  unlink: protectedProcedure
    .input(unlinkAccountInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const accounts = await db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.userId, ctx.user.id),
            eq(socialAccounts.provider, input.provider)
          )
        )
        .limit(1) as SocialAccount[]

      const account = accounts[0]

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No ${input.provider} account linked`,
        })
      }

      if (account.accessToken) {
        try {
          await revokeAccessToken(input.provider, account.accessToken)
        } catch {
        }
      }

      await db
        .delete(socialAccounts)
        .where(eq(socialAccounts.id, account.id))

      return { success: true }
    }),

  getLinkedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db

    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, ctx.user.id)) as SocialAccount[]

    return accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      profile: account.profile,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }))
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthSocialRouter = typeof authSocialRouter
