// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Contact Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createContactInput = z.object({
  firstName: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  lastName: z.string().max(PAGINATION.MAX_LIMIT).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  source: z.string().max(PAGINATION.MAX_LIMIT).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const updateContactInput = z.object({
  contactId: z.string().uuid(),
  firstName: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  lastName: z.string().max(PAGINATION.MAX_LIMIT).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  source: z.string().max(PAGINATION.MAX_LIMIT).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
})

export const listContactsInput = z.object({
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
  search: z.string().max(200).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  tagId: z.string().uuid().optional(),
  sortBy: z.enum(["createdAt", "firstName", "lastName", "company"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const getContactInput = z.object({
  contactId: z.string().uuid(),
})

export const deleteContactInput = z.object({
  contactId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Tag Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createTagInput = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
  description: z.string().max(200).optional(),
})

export const updateTagInput = z.object({
  tagId: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
})

export const deleteTagInput = z.object({
  tagId: z.string().uuid(),
})

export const addTagToContactInput = z.object({
  contactId: z.string().uuid(),
  tagId: z.string().uuid(),
})

export const removeTagFromContactInput = z.object({
  contactId: z.string().uuid(),
  tagId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Note Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createNoteInput = z.object({
  contactId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().default(false),
})

export const updateNoteInput = z.object({
  noteId: z.string().uuid(),
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
})

export const deleteNoteInput = z.object({
  noteId: z.string().uuid(),
})

export const listNotesInput = z.object({
  contactId: z.string().uuid(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Activity Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createActivityInput = z.object({
  contactId: z.string().uuid(),
  type: z.enum(["call", "email", "meeting", "task", "note"]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateActivityInput = z.object({
  activityId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const deleteActivityInput = z.object({
  activityId: z.string().uuid(),
})

export const listActivitiesInput = z.object({
  contactId: z.string().uuid().optional(),
  type: z.enum(["call", "email", "meeting", "task", "note"]).optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Deal Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createDealInput = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).default("lead"),
  probability: z.number().min(0).max(PAGINATION.MAX_LIMIT).default(0),
  expectedCloseDate: z.string().datetime().optional(),
})

export const updateDealInput = z.object({
  dealId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  probability: z.number().min(0).max(PAGINATION.MAX_LIMIT).optional(),
  expectedCloseDate: z.string().datetime().optional(),
})

export const deleteDealInput = z.object({
  dealId: z.string().uuid(),
})

export const listDealsInput = z.object({
  contactId: z.string().uuid().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["createdAt", "value", "expectedCloseDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type CreateContactInput = z.infer<typeof createContactInput>
export type UpdateContactInput = z.infer<typeof updateContactInput>
export type ListContactsInput = z.infer<typeof listContactsInput>
export type GetContactInput = z.infer<typeof getContactInput>
export type DeleteContactInput = z.infer<typeof deleteContactInput>

export type CreateTagInput = z.infer<typeof createTagInput>
export type UpdateTagInput = z.infer<typeof updateTagInput>
export type DeleteTagInput = z.infer<typeof deleteTagInput>
export type AddTagToContactInput = z.infer<typeof addTagToContactInput>
export type RemoveTagFromContactInput = z.infer<typeof removeTagFromContactInput>

export type CreateNoteInput = z.infer<typeof createNoteInput>
export type UpdateNoteInput = z.infer<typeof updateNoteInput>
export type DeleteNoteInput = z.infer<typeof deleteNoteInput>
export type ListNotesInput = z.infer<typeof listNotesInput>

export type CreateActivityInput = z.infer<typeof createActivityInput>
export type UpdateActivityInput = z.infer<typeof updateActivityInput>
export type DeleteActivityInput = z.infer<typeof deleteActivityInput>
export type ListActivitiesInput = z.infer<typeof listActivitiesInput>

export type CreateDealInput = z.infer<typeof createDealInput>
export type UpdateDealInput = z.infer<typeof updateDealInput>
export type DeleteDealInput = z.infer<typeof deleteDealInput>
export type ListDealsInput = z.infer<typeof listDealsInput>
