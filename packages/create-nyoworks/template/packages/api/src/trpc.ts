// ═══════════════════════════════════════════════════════════════════════════════
// tRPC Instance & Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { Context } from "./context"

// ─────────────────────────────────────────────────────────────────────────────
// tRPC Initialization
// ─────────────────────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error
            ? error.cause.message
            : null,
      },
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const hasTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tenant ID is required",
    })
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const tenantProcedure = t.procedure.use(isAuthed).use(hasTenant)
export const createCallerFactory = t.createCallerFactory
