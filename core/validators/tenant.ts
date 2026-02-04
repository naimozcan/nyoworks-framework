// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { nameSchema, slugSchema } from "./common"

// ─────────────────────────────────────────────────────────────────────────────
// Update Tenant
// ─────────────────────────────────────────────────────────────────────────────

export const updateTenantSchema = z.object({
  name: nameSchema.optional(),
  domain: z.string().max(255).optional().nullable(),
  logo: z.string().url().max(500).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Check Slug Availability
// ─────────────────────────────────────────────────────────────────────────────

export const checkSlugSchema = z.object({
  slug: slugSchema,
})

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Settings
// ─────────────────────────────────────────────────────────────────────────────

export const tenantSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  locale: z.enum(["en", "tr", "nl"]).default("en"),
  timezone: z.string().default("UTC"),
  dateFormat: z.string().default("YYYY-MM-DD"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  features: z.record(z.boolean()).default({}),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type CheckSlugInput = z.infer<typeof checkSlugSchema>
export type TenantSettings = z.infer<typeof tenantSettingsSchema>
