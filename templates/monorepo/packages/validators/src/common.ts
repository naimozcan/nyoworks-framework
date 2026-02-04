// ═══════════════════════════════════════════════════════════════════════════════
// Common Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid()

export const emailSchema = z.string().email().toLowerCase().trim()

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

export const slugSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")

export const nameSchema = z.string().min(1).max(255).trim()

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const searchSchema = z.object({
  q: z.string().max(255).optional(),
})

export const listQuerySchema = paginationSchema.merge(sortSchema).merge(searchSchema)

// ─────────────────────────────────────────────────────────────────────────────
// Response
// ─────────────────────────════════════════════════════════════════════════════

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
    meta: z
      .object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      })
      .optional(),
  })

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Pagination = z.infer<typeof paginationSchema>
export type ListQuery = z.infer<typeof listQuerySchema>
