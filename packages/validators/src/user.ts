// ═══════════════════════════════════════════════════════════════════════════════
// User Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { uuidSchema, emailSchema, nameSchema, paginationSchema, searchSchema } from "./common"

// ─────────────────────────────────────────────────────────────────────────────
// Create User (Invite)
// ─────────────────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  roleId: uuidSchema,
})

// ─────────────────────────────────────────────────────────────────────────────
// Update User
// ─────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  roleId: uuidSchema.optional(),
  avatar: z.string().url().max(500).optional().nullable(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Update Profile (Self)
// ─────────────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  avatar: z.string().url().max(500).optional().nullable(),
})

// ─────────────────────────────────────────────────────────────────────────────
// List Users Query
// ─────────────────────────────────────────────────────────────────────────────

export const listUsersQuerySchema = paginationSchema.merge(searchSchema).extend({
  role: uuidSchema.optional(),
  status: z.enum(["active", "deleted"]).default("active"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
