// ═══════════════════════════════════════════════════════════════════════════════
// Users Router
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { router, protectedProcedure, tenantProcedure } from "../trpc"

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────────

const updateProfileInput = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
})

const changePasswordInput = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})

const listUsersInput = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const usersRouter = router({
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user
    }),

  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      return {
        ...ctx.user,
        ...input,
      }
    }),

  changePassword: protectedProcedure
    .input(changePasswordInput)
    .mutation(async ({ ctx, input }) => {
      return { success: true }
    }),

  list: tenantProcedure
    .input(listUsersInput)
    .query(async ({ ctx, input }) => {
      return {
        data: [],
        pagination: {
          page: input.page,
          limit: input.limit,
          total: 0,
          hasMore: false,
        },
      }
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return null
    }),
})
