// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  linkAccountInput,
  unlinkAccountInput,
  getOAuthUrlInput,
  socialLoginInput,
} from "./validators.js"
import { AuthSocialService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSocialContext {
  user?: { id: string; email: string }
  db: unknown
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
    .query(({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db)
      return service.getOAuthUrl(input)
    }),

  login: t.procedure
    .input(socialLoginInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db, ctx.createSession, ctx.findOrCreateUser)
      return service.login(input)
    }),

  link: protectedProcedure
    .input(linkAccountInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db)
      return service.linkAccount(ctx.user.id, input)
    }),

  unlink: protectedProcedure
    .input(unlinkAccountInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db)
      return service.unlinkAccount(ctx.user.id, input.provider)
    }),

  getLinkedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const service = new AuthSocialService(ctx.db)
    return service.getLinkedAccounts(ctx.user.id)
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthSocialRouter = typeof authSocialRouter
