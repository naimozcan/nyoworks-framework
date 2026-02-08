// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
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
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface CRMContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<CRMContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Contacts Router
// ─────────────────────────────────────────────────────────────────────────────

const contactsRouter = t.router({
  create: protectedProcedure
    .input(createContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createContact({
        ...input,
        ownerId: ctx.user.id,
      })
    }),

  update: protectedProcedure
    .input(updateContactInput)
    .mutation(async ({ input, ctx }) => {
      const { contactId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateContact(contactId, updateData)
    }),

  get: protectedProcedure
    .input(getContactInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.getContact(input.contactId)
    }),

  list: protectedProcedure
    .input(listContactsInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listContacts(input)
    }),

  delete: protectedProcedure
    .input(deleteContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteContact(input.contactId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Tags Router
// ─────────────────────────────────────────────────────────────────────────────

const tagsRouter = t.router({
  create: protectedProcedure
    .input(createTagInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createTag(input)
    }),

  update: protectedProcedure
    .input(updateTagInput)
    .mutation(async ({ input, ctx }) => {
      const { tagId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateTag(tagId, updateData)
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new CRMService(ctx.db, ctx.tenantId)
    return service.listTags()
  }),

  delete: protectedProcedure
    .input(deleteTagInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteTag(input.tagId)
    }),

  addToContact: protectedProcedure
    .input(addTagToContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.addTagToContact(input.contactId, input.tagId)
    }),

  removeFromContact: protectedProcedure
    .input(removeTagFromContactInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.removeTagFromContact(input.contactId, input.tagId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notes Router
// ─────────────────────────────────────────────────────────────────────────────

const notesRouter = t.router({
  create: protectedProcedure
    .input(createNoteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createNote({
        ...input,
        authorId: ctx.user.id,
      })
    }),

  update: protectedProcedure
    .input(updateNoteInput)
    .mutation(async ({ input, ctx }) => {
      const { noteId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateNote(noteId, updateData)
    }),

  list: protectedProcedure
    .input(listNotesInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listNotes(input)
    }),

  delete: protectedProcedure
    .input(deleteNoteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteNote(input.noteId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Activities Router
// ─────────────────────────────────────────────────────────────────────────────

const activitiesRouter = t.router({
  create: protectedProcedure
    .input(createActivityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createActivity({
        ...input,
        userId: ctx.user.id,
      })
    }),

  update: protectedProcedure
    .input(updateActivityInput)
    .mutation(async ({ input, ctx }) => {
      const { activityId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateActivity(activityId, updateData)
    }),

  list: protectedProcedure
    .input(listActivitiesInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listActivities(input)
    }),

  delete: protectedProcedure
    .input(deleteActivityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteActivity(input.activityId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Deals Router
// ─────────────────────────────────────────────────────────────────────────────

const dealsRouter = t.router({
  create: protectedProcedure
    .input(createDealInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.createDeal({
        ...input,
        ownerId: ctx.user.id,
      })
    }),

  update: protectedProcedure
    .input(updateDealInput)
    .mutation(async ({ input, ctx }) => {
      const { dealId, ...updateData } = input
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.updateDeal(dealId, updateData)
    }),

  list: protectedProcedure
    .input(listDealsInput)
    .query(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.listDeals(input)
    }),

  delete: protectedProcedure
    .input(deleteDealInput)
    .mutation(async ({ input, ctx }) => {
      const service = new CRMService(ctx.db, ctx.tenantId)
      return service.deleteDeal(input.dealId)
    }),

  pipeline: protectedProcedure.query(async ({ ctx }) => {
    const service = new CRMService(ctx.db, ctx.tenantId)
    return service.getPipeline()
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const crmRouter = t.router({
  contacts: contactsRouter,
  tags: tagsRouter,
  notes: notesRouter,
  activities: activitiesRouter,
  deals: dealsRouter,
})

export type CRMRouter = typeof crmRouter
