// ═══════════════════════════════════════════════════════════════════════════════
// Auth Social Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, publicProcedure, protectedProcedure } from "@nyoworks/api"
import {
  linkAccountInput,
  unlinkAccountInput,
  getOAuthUrlInput,
  socialLoginInput,
} from "./validators.js"
import { AuthSocialService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const authSocialRouter = router({
  getOAuthUrl: publicProcedure
    .input(getOAuthUrlInput)
    .query(({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db)
      return service.getOAuthUrl(input)
    }),

  login: publicProcedure
    .input(socialLoginInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AuthSocialService(ctx.db)
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
