// ═══════════════════════════════════════════════════════════════════════════════
// Auth Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { router, publicProcedure, protectedProcedure } from "../trpc"

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────────

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

const refreshInput = z.object({
  refreshToken: z.string(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const authRouter = router({
  login: publicProcedure
    .input(loginInput)
    .mutation(async ({ input }) => {
      return {
        user: {
          id: "placeholder",
          email: input.email,
          name: "User",
        },
        accessToken: "placeholder",
        refreshToken: "placeholder",
      }
    }),

  register: publicProcedure
    .input(registerInput)
    .mutation(async ({ input }) => {
      return {
        user: {
          id: "placeholder",
          email: input.email,
          name: input.name,
        },
        accessToken: "placeholder",
        refreshToken: "placeholder",
      }
    }),

  refresh: publicProcedure
    .input(refreshInput)
    .mutation(async ({ input }) => {
      return {
        accessToken: "placeholder",
        refreshToken: "placeholder",
      }
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      return { success: true }
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user
    }),
})
