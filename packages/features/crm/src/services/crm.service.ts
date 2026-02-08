// ═══════════════════════════════════════════════════════════════════════════════
// CRM Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import {
  ContactsRepository,
  TagsRepository,
  NotesRepository,
  ActivitiesRepository,
  DealsRepository,
  type ContactListResult,
  type NoteListResult,
  type ActivityListResult,
  type DealListResult,
  type Pipeline,
} from "../repositories/index.js"
import type { Contact, Tag, Note, Activity, Deal } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateContactInput {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  status?: string
  source?: string
  avatarUrl?: string
  customFields?: Record<string, unknown>
  ownerId: string
  tagIds?: string[]
}

export interface UpdateContactInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  status?: string
  source?: string
  avatarUrl?: string
  customFields?: Record<string, unknown>
}

export interface CreateTagInput {
  name: string
  color?: string
  description?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
  description?: string
}

export interface CreateNoteInput {
  contactId: string
  content: string
  isPinned?: boolean
  authorId: string
}

export interface UpdateNoteInput {
  content?: string
  isPinned?: boolean
}

export interface CreateActivityInput {
  contactId: string
  type: string
  title: string
  description?: string
  scheduledAt?: string
  metadata?: Record<string, unknown>
  userId: string
}

export interface UpdateActivityInput {
  type?: string
  title?: string
  description?: string
  scheduledAt?: string
  completedAt?: string
  metadata?: Record<string, unknown>
}

export interface CreateDealInput {
  contactId?: string
  title: string
  value?: number
  currency?: string
  stage?: string
  probability?: number
  expectedCloseDate?: string
  ownerId: string
}

export interface UpdateDealInput {
  contactId?: string
  title?: string
  value?: number
  currency?: string
  stage?: string
  probability?: number
  expectedCloseDate?: string
}

export interface ListContactsInput {
  limit: number
  offset: number
  search?: string
  status?: string
  tagId?: string
  sortBy?: "createdAt" | "firstName" | "lastName" | "company"
  sortOrder?: "asc" | "desc"
}

export interface ListNotesInput {
  contactId: string
  limit: number
  offset: number
}

export interface ListActivitiesInput {
  contactId?: string
  type?: string
  limit: number
  offset: number
}

export interface ListDealsInput {
  contactId?: string
  stage?: string
  limit: number
  offset: number
  sortBy?: "createdAt" | "value" | "expectedCloseDate"
  sortOrder?: "asc" | "desc"
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class CRMService {
  private readonly contactsRepo: ContactsRepository
  private readonly tagsRepo: TagsRepository
  private readonly notesRepo: NotesRepository
  private readonly activitiesRepo: ActivitiesRepository
  private readonly dealsRepo: DealsRepository

  constructor(db: DrizzleDatabase, tenantId: string) {
    this.contactsRepo = new ContactsRepository(db, tenantId)
    this.tagsRepo = new TagsRepository(db, tenantId)
    this.notesRepo = new NotesRepository(db)
    this.activitiesRepo = new ActivitiesRepository(db)
    this.dealsRepo = new DealsRepository(db, tenantId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Contacts
  // ─────────────────────────────────────────────────────────────────────────────

  async createContact(input: CreateContactInput): Promise<Contact> {
    const { tagIds, ...contactData } = input
    const contact = await this.contactsRepo.create(contactData)

    if (tagIds && tagIds.length > 0) {
      await this.contactsRepo.addTags(contact.id, tagIds)
    }

    return contact
  }

  async updateContact(contactId: string, input: UpdateContactInput): Promise<Contact> {
    const contact = await this.contactsRepo.update(contactId, input)

    if (!contact) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
    }

    return contact
  }

  async getContact(contactId: string): Promise<Contact> {
    const contact = await this.contactsRepo.findById(contactId)

    if (!contact) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
    }

    return contact
  }

  async listContacts(input: ListContactsInput): Promise<ContactListResult> {
    return this.contactsRepo.list(input)
  }

  async deleteContact(contactId: string): Promise<{ success: boolean }> {
    const deleted = await this.contactsRepo.delete(contactId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tags
  // ─────────────────────────────────────────────────────────────────────────────

  async createTag(input: CreateTagInput): Promise<Tag> {
    return this.tagsRepo.create(input)
  }

  async updateTag(tagId: string, input: UpdateTagInput): Promise<Tag> {
    const tag = await this.tagsRepo.update(tagId, input)

    if (!tag) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" })
    }

    return tag
  }

  async listTags(): Promise<Tag[]> {
    return this.tagsRepo.list()
  }

  async deleteTag(tagId: string): Promise<{ success: boolean }> {
    const deleted = await this.tagsRepo.delete(tagId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" })
    }

    return { success: true }
  }

  async addTagToContact(contactId: string, tagId: string): Promise<{ success: boolean }> {
    await this.contactsRepo.addTag(contactId, tagId)
    return { success: true }
  }

  async removeTagFromContact(contactId: string, tagId: string): Promise<{ success: boolean }> {
    await this.contactsRepo.removeTag(contactId, tagId)
    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Notes
  // ─────────────────────────────────────────────────────────────────────────────

  async createNote(input: CreateNoteInput): Promise<Note> {
    return this.notesRepo.create(input)
  }

  async updateNote(noteId: string, input: UpdateNoteInput): Promise<Note> {
    const note = await this.notesRepo.update(noteId, input)

    if (!note) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" })
    }

    return note
  }

  async listNotes(input: ListNotesInput): Promise<NoteListResult> {
    return this.notesRepo.listByContact(input)
  }

  async deleteNote(noteId: string): Promise<{ success: boolean }> {
    const deleted = await this.notesRepo.delete(noteId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Activities
  // ─────────────────────────────────────────────────────────────────────────────

  async createActivity(input: CreateActivityInput): Promise<Activity> {
    return this.activitiesRepo.create({
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    })
  }

  async updateActivity(activityId: string, input: UpdateActivityInput): Promise<Activity> {
    const activity = await this.activitiesRepo.update(activityId, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
    })

    if (!activity) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" })
    }

    return activity
  }

  async listActivities(input: ListActivitiesInput): Promise<ActivityListResult> {
    return this.activitiesRepo.list(input)
  }

  async deleteActivity(activityId: string): Promise<{ success: boolean }> {
    const deleted = await this.activitiesRepo.delete(activityId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Deals
  // ─────────────────────────────────────────────────────────────────────────────

  async createDeal(input: CreateDealInput): Promise<Deal> {
    return this.dealsRepo.create({
      ...input,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
    })
  }

  async updateDeal(dealId: string, input: UpdateDealInput): Promise<Deal> {
    const updateData: Record<string, unknown> = { ...input }

    if (input.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null
    }

    if (input.stage === "won" || input.stage === "lost") {
      updateData.closedAt = new Date()
    }

    const deal = await this.dealsRepo.update(dealId, updateData)

    if (!deal) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" })
    }

    return deal
  }

  async listDeals(input: ListDealsInput): Promise<DealListResult> {
    return this.dealsRepo.list(input)
  }

  async deleteDeal(dealId: string): Promise<{ success: boolean }> {
    const deleted = await this.dealsRepo.delete(dealId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" })
    }

    return { success: true }
  }

  async getPipeline(): Promise<Pipeline> {
    return this.dealsRepo.getPipeline()
  }
}
