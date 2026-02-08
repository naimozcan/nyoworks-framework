// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, like, desc, asc, sql } from "drizzle-orm"
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
import { contacts, tags, contactTags, notes, activities, deals } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface CRMContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
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
      const { tagIds, ...contactData } = input
      const db = ctx.db as never

      const [contact] = await db
        .insert(contacts)
        .values({
          ...contactData,
          tenantId: ctx.tenantId,
          ownerId: ctx.user.id,
        })
        .returning()

      if (tagIds && tagIds.length > 0) {
        await db.insert(contactTags).values(
          tagIds.map((tagId: string) => ({
            contactId: contact.id,
            tagId,
          }))
        )
      }

      return contact
    }),

  update: protectedProcedure
    .input(updateContactInput)
    .mutation(async ({ input, ctx }) => {
      const { contactId, ...updateData } = input
      const db = ctx.db as never

      const [contact] = await db
        .update(contacts)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, ctx.tenantId)))
        .returning()

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      }

      return contact
    }),

  get: protectedProcedure
    .input(getContactInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const contact = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, input.contactId), eq(contacts.tenantId, ctx.tenantId)))
        .limit(1)

      if (!contact[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      }

      return contact[0]
    }),

  list: protectedProcedure
    .input(listContactsInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { limit, offset, search, status, sortBy, sortOrder } = input

      let query = db
        .select()
        .from(contacts)
        .where(eq(contacts.tenantId, ctx.tenantId))

      if (search) {
        query = query.where(
          like(contacts.firstName, `%${search}%`)
        )
      }

      if (status) {
        query = query.where(eq(contacts.status, status))
      }

      const orderFn = sortOrder === "asc" ? asc : desc
      query = query.orderBy(orderFn(contacts[sortBy as keyof typeof contacts]))

      const items = await query.limit(limit).offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(eq(contacts.tenantId, ctx.tenantId))

      return {
        items,
        total: countResult[0]?.count || 0,
        hasMore: offset + limit < (countResult[0]?.count || 0),
      }
    }),

  delete: protectedProcedure
    .input(deleteContactInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(contacts)
        .where(and(eq(contacts.id, input.contactId), eq(contacts.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Tags Router
// ─────────────────────────────────────────────────────────────────────────────

const tagsRouter = t.router({
  create: protectedProcedure
    .input(createTagInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [tag] = await db
        .insert(tags)
        .values({
          ...input,
          tenantId: ctx.tenantId,
        })
        .returning()

      return tag
    }),

  update: protectedProcedure
    .input(updateTagInput)
    .mutation(async ({ input, ctx }) => {
      const { tagId, ...updateData } = input
      const db = ctx.db as never

      const [tag] = await db
        .update(tags)
        .set(updateData)
        .where(and(eq(tags.id, tagId), eq(tags.tenantId, ctx.tenantId)))
        .returning()

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" })
      }

      return tag
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    return db
      .select()
      .from(tags)
      .where(eq(tags.tenantId, ctx.tenantId))
      .orderBy(asc(tags.name))
  }),

  delete: protectedProcedure
    .input(deleteTagInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(tags)
        .where(and(eq(tags.id, input.tagId), eq(tags.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" })
      }

      return { success: true }
    }),

  addToContact: protectedProcedure
    .input(addTagToContactInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db.insert(contactTags).values({
        contactId: input.contactId,
        tagId: input.tagId,
      })

      return { success: true }
    }),

  removeFromContact: protectedProcedure
    .input(removeTagFromContactInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .delete(contactTags)
        .where(
          and(
            eq(contactTags.contactId, input.contactId),
            eq(contactTags.tagId, input.tagId)
          )
        )

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notes Router
// ─────────────────────────────────────────────────────────────────────────────

const notesRouter = t.router({
  create: protectedProcedure
    .input(createNoteInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [note] = await db
        .insert(notes)
        .values({
          ...input,
          authorId: ctx.user.id,
        })
        .returning()

      return note
    }),

  update: protectedProcedure
    .input(updateNoteInput)
    .mutation(async ({ input, ctx }) => {
      const { noteId, ...updateData } = input
      const db = ctx.db as never

      const [note] = await db
        .update(notes)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, noteId))
        .returning()

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" })
      }

      return note
    }),

  list: protectedProcedure
    .input(listNotesInput)
    .query(async ({ input, ctx }) => {
      const { contactId, limit, offset } = input
      const db = ctx.db as never

      const items = await db
        .select()
        .from(notes)
        .where(eq(notes.contactId, contactId))
        .orderBy(desc(notes.isPinned), desc(notes.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  delete: protectedProcedure
    .input(deleteNoteInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(notes)
        .where(eq(notes.id, input.noteId))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Activities Router
// ─────────────────────────────────────────────────────────────────────────────

const activitiesRouter = t.router({
  create: protectedProcedure
    .input(createActivityInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [activity] = await db
        .insert(activities)
        .values({
          ...input,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          userId: ctx.user.id,
        })
        .returning()

      return activity
    }),

  update: protectedProcedure
    .input(updateActivityInput)
    .mutation(async ({ input, ctx }) => {
      const { activityId, scheduledAt, completedAt, ...updateData } = input
      const db = ctx.db as never

      const [activity] = await db
        .update(activities)
        .set({
          ...updateData,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          completedAt: completedAt ? new Date(completedAt) : undefined,
        })
        .where(eq(activities.id, activityId))
        .returning()

      if (!activity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" })
      }

      return activity
    }),

  list: protectedProcedure
    .input(listActivitiesInput)
    .query(async ({ input, ctx }) => {
      const { contactId, type, limit, offset } = input
      const db = ctx.db as never

      let query = db.select().from(activities)

      if (contactId) {
        query = query.where(eq(activities.contactId, contactId))
      }

      if (type) {
        query = query.where(eq(activities.type, type))
      }

      const items = await query
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  delete: protectedProcedure
    .input(deleteActivityInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(activities)
        .where(eq(activities.id, input.activityId))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activity not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Deals Router
// ─────────────────────────────────────────────────────────────────────────────

const dealsRouter = t.router({
  create: protectedProcedure
    .input(createDealInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deal] = await db
        .insert(deals)
        .values({
          ...input,
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          tenantId: ctx.tenantId,
          ownerId: ctx.user.id,
        })
        .returning()

      return deal
    }),

  update: protectedProcedure
    .input(updateDealInput)
    .mutation(async ({ input, ctx }) => {
      const { dealId, expectedCloseDate, ...updateData } = input
      const db = ctx.db as never

      const updatePayload: Record<string, unknown> = {
        ...updateData,
        updatedAt: new Date(),
      }

      if (expectedCloseDate !== undefined) {
        updatePayload.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null
      }

      if (updateData.stage === "won" || updateData.stage === "lost") {
        updatePayload.closedAt = new Date()
      }

      const [deal] = await db
        .update(deals)
        .set(updatePayload)
        .where(and(eq(deals.id, dealId), eq(deals.tenantId, ctx.tenantId)))
        .returning()

      if (!deal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" })
      }

      return deal
    }),

  list: protectedProcedure
    .input(listDealsInput)
    .query(async ({ input, ctx }) => {
      const { contactId, stage, limit, offset, sortBy, sortOrder } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(deals)
        .where(eq(deals.tenantId, ctx.tenantId))

      if (contactId) {
        query = query.where(eq(deals.contactId, contactId))
      }

      if (stage) {
        query = query.where(eq(deals.stage, stage))
      }

      const orderFn = sortOrder === "asc" ? asc : desc
      query = query.orderBy(orderFn(deals[sortBy as keyof typeof deals]))

      const items = await query.limit(limit).offset(offset)

      return { items }
    }),

  delete: protectedProcedure
    .input(deleteDealInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(deals)
        .where(and(eq(deals.id, input.dealId), eq(deals.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" })
      }

      return { success: true }
    }),

  pipeline: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]
    const pipeline: Record<string, { count: number; totalValue: number }> = {}

    for (const stage of stages) {
      const result = await db
        .select({
          count: sql<number>`count(*)`,
          totalValue: sql<number>`coalesce(sum(value), 0)`,
        })
        .from(deals)
        .where(and(eq(deals.tenantId, ctx.tenantId), eq(deals.stage, stage)))

      pipeline[stage] = {
        count: result[0]?.count || 0,
        totalValue: result[0]?.totalValue || 0,
      }
    }

    return pipeline
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
