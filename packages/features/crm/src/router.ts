// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
import {
  createContactInput,
  updateContactInput,
  listContactsInput,
  getContactInput,
  deleteContactInput,
  createTagInput,
  updateTagInput,
  deleteTagInput,
  addTagToContactInput,
  removeTagFromContactInput,
  createNoteInput,
  updateNoteInput,
  deleteNoteInput,
  listNotesInput,
  createActivityInput,
  updateActivityInput,
  deleteActivityInput,
  listActivitiesInput,
  createDealInput,
  updateDealInput,
  deleteDealInput,
  listDealsInput,
} from "./validators.js"
import { CRMService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Contacts Router
// ─────────────────────────────────────────────────────────────────────────────

const contactsRouter = router({
  create: tenantProcedure
    .input(createContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createContact({
        ...input,
        ownerId: ctx.user.id,
      })
    }),

  update: tenantProcedure
    .input(updateContactInput)
    .mutation(async ({ input, ctx }) => {
      const { contactId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateContact(contactId, updateData)
    }),

  get: tenantProcedure
    .input(getContactInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.getContact(input.contactId)
    }),

  list: tenantProcedure
    .input(listContactsInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listContacts(input)
    }),

  delete: tenantProcedure
    .input(deleteContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteContact(input.contactId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Tags Router
// ─────────────────────────────────────────────────────────────────────────────

const tagsRouter = router({
  create: tenantProcedure
    .input(createTagInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createTag(input)
    }),

  update: tenantProcedure
    .input(updateTagInput)
    .mutation(async ({ input, ctx }) => {
      const { tagId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateTag(tagId, updateData)
    }),

  list: tenantProcedure.query(async ({ ctx }) => {
    const service = new CRMService(ctx.db, ctx.tenantId)
    return service.listTags()
  }),

  delete: tenantProcedure
    .input(deleteTagInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteTag(input.tagId)
    }),

  addToContact: tenantProcedure
    .input(addTagToContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.addTagToContact(input.contactId, input.tagId)
    }),

  removeFromContact: tenantProcedure
    .input(removeTagFromContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.removeTagFromContact(input.contactId, input.tagId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notes Router
// ─────────────────────────────────────────────────────────────────────────────

const notesRouter = router({
  create: tenantProcedure
    .input(createNoteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createNote({
        ...input,
        authorId: ctx.user.id,
      })
    }),

  update: tenantProcedure
    .input(updateNoteInput)
    .mutation(async ({ input, ctx }) => {
      const { noteId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateNote(noteId, updateData)
    }),

  list: tenantProcedure
    .input(listNotesInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listNotes(input)
    }),

  delete: tenantProcedure
    .input(deleteNoteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteNote(input.noteId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Activities Router
// ─────────────────────────────────────────────────────────────────────────────

const activitiesRouter = router({
  create: tenantProcedure
    .input(createActivityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createActivity({
        ...input,
        userId: ctx.user.id,
      })
    }),

  update: tenantProcedure
    .input(updateActivityInput)
    .mutation(async ({ input, ctx }) => {
      const { activityId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateActivity(activityId, updateData)
    }),

  list: tenantProcedure
    .input(listActivitiesInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listActivities(input)
    }),

  delete: tenantProcedure
    .input(deleteActivityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteActivity(input.activityId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Deals Router
// ─────────────────────────────────────────────────────────────────────────────

const dealsRouter = router({
  create: tenantProcedure
    .input(createDealInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createDeal({
        ...input,
        ownerId: ctx.user.id,
      })
    }),

  update: tenantProcedure
    .input(updateDealInput)
    .mutation(async ({ input, ctx }) => {
      const { dealId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateDeal(dealId, updateData)
    }),

  list: tenantProcedure
    .input(listDealsInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listDeals(input)
    }),

  delete: tenantProcedure
    .input(deleteDealInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteDeal(input.dealId)
    }),

  pipeline: tenantProcedure.query(async ({ ctx }) => {
    const service = new CRMService(ctx.db, ctx.tenantId)
    return service.getPipeline()
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const crmRouter = router({
  contacts: contactsRouter,
  tags: tagsRouter,
  notes: notesRouter,
  activities: activitiesRouter,
  deals: dealsRouter,
})

export type CRMRouter = typeof crmRouter
