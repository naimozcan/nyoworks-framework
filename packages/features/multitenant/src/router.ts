// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, sql, asc, gt } from "drizzle-orm"
import {
  createTenantInput,
  updateTenantInput,
  getTenantInput,
  getTenantBySlugInput,
  deleteTenantInput,
  listTenantsInput,
  inviteMemberInput,
  removeMemberInput,
  updateMemberRoleInput,
  listMembersInput,
  acceptInviteInput,
  cancelInviteInput,
  listInvitesInput,
  switchTenantInput,
} from "./validators.js"
import { tenants, tenantMembers, tenantInvites } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface MultitenantContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
}

const t = initTRPC.context<MultitenantContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const hasTenantContext = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant context required" })
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
const tenantProcedure = t.procedure.use(hasTenantContext)

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenants Router
// ─────────────────────────────────────────────────────────────────────────────

const tenantsRouter = t.router({
  create: protectedProcedure
    .input(createTenantInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const existingSlug = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, input.slug))
        .limit(1)

      if (existingSlug[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" })
      }

      const [tenant] = await db
        .insert(tenants)
        .values(input)
        .returning()

      await db.insert(tenantMembers).values({
        tenantId: tenant.id,
        userId: ctx.user.id,
        role: "owner",
        joinedAt: new Date(),
      })

      return tenant
    }),

  update: tenantProcedure
    .input(updateTenantInput)
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...updateData } = input
      const db = ctx.db as never

      if (tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update other tenants" })
      }

      if (updateData.slug) {
        const existingSlug = await db
          .select()
          .from(tenants)
          .where(and(eq(tenants.slug, updateData.slug), sql`${tenants.id} != ${tenantId}`))
          .limit(1)

        if (existingSlug[0]) {
          throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" })
        }
      }

      const [tenant] = await db
        .update(tenants)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning()

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
      }

      return tenant
    }),

  get: protectedProcedure
    .input(getTenantInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1)

      if (!tenant[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
      }

      return tenant[0]
    }),

  getBySlug: t.procedure
    .input(getTenantBySlugInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, input.slug))
        .limit(1)

      if (!tenant[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
      }

      return tenant[0]
    }),

  list: protectedProcedure
    .input(listTenantsInput)
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input
      const db = ctx.db as never

      const memberTenantIds = await db
        .select({ tenantId: tenantMembers.tenantId })
        .from(tenantMembers)
        .where(eq(tenantMembers.userId, ctx.user.id))

      if (memberTenantIds.length === 0) {
        return { items: [], total: 0, hasMore: false }
      }

      const tenantIds = memberTenantIds.map((m: { tenantId: string }) => m.tenantId)

      let query = db
        .select()
        .from(tenants)
        .where(sql`${tenants.id} IN ${tenantIds}`)

      if (status) {
        query = query.where(eq(tenants.status, status))
      }

      const items = await query.limit(limit).offset(offset).orderBy(asc(tenants.name))

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenants)
        .where(sql`${tenants.id} IN ${tenantIds}`)

      return {
        items,
        total: countResult[0]?.count || 0,
        hasMore: offset + limit < (countResult[0]?.count || 0),
      }
    }),

  delete: tenantProcedure
    .input(deleteTenantInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete other tenants" })
      }

      const member = await db
        .select()
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, input.tenantId),
            eq(tenantMembers.userId, ctx.user.id),
            eq(tenantMembers.role, "owner")
          )
        )
        .limit(1)

      if (!member[0]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can delete tenant" })
      }

      const [deleted] = await db
        .delete(tenants)
        .where(eq(tenants.id, input.tenantId))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Members Router
// ─────────────────────────────────────────────────────────────────────────────

const membersRouter = t.router({
  invite: tenantProcedure
    .input(inviteMemberInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot invite to other tenants" })
      }

      const existingInvite = await db
        .select()
        .from(tenantInvites)
        .where(
          and(
            eq(tenantInvites.tenantId, input.tenantId),
            eq(tenantInvites.email, input.email),
            gt(tenantInvites.expiresAt, new Date())
          )
        )
        .limit(1)

      if (existingInvite[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Invite already exists for this email" })
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const [invite] = await db
        .insert(tenantInvites)
        .values({
          tenantId: input.tenantId,
          email: input.email,
          role: input.role,
          token: generateInviteToken(),
          expiresAt,
        })
        .returning()

      return invite
    }),

  remove: tenantProcedure
    .input(removeMemberInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove from other tenants" })
      }

      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" })
      }

      const [deleted] = await db
        .delete(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, input.tenantId),
            eq(tenantMembers.userId, input.userId)
          )
        )
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
      }

      return { success: true }
    }),

  updateRole: tenantProcedure
    .input(updateMemberRoleInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update other tenants" })
      }

      const [member] = await db
        .update(tenantMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(tenantMembers.tenantId, input.tenantId),
            eq(tenantMembers.userId, input.userId)
          )
        )
        .returning()

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
      }

      return member
    }),

  list: tenantProcedure
    .input(listMembersInput)
    .query(async ({ input, ctx }) => {
      const { tenantId, limit, offset } = input
      const db = ctx.db as never

      if (tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot list other tenants" })
      }

      const items = await db
        .select()
        .from(tenantMembers)
        .where(eq(tenantMembers.tenantId, tenantId))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  acceptInvite: protectedProcedure
    .input(acceptInviteInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [invite] = await db
        .select()
        .from(tenantInvites)
        .where(
          and(
            eq(tenantInvites.token, input.token),
            gt(tenantInvites.expiresAt, new Date())
          )
        )
        .limit(1)

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite" })
      }

      const existingMember = await db
        .select()
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, invite.tenantId),
            eq(tenantMembers.userId, ctx.user.id)
          )
        )
        .limit(1)

      if (existingMember[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Already a member of this tenant" })
      }

      const [member] = await db
        .insert(tenantMembers)
        .values({
          tenantId: invite.tenantId,
          userId: ctx.user.id,
          role: invite.role,
          invitedAt: invite.createdAt,
          joinedAt: new Date(),
        })
        .returning()

      await db
        .delete(tenantInvites)
        .where(eq(tenantInvites.id, invite.id))

      return member
    }),

  cancelInvite: tenantProcedure
    .input(cancelInviteInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(tenantInvites)
        .where(
          and(
            eq(tenantInvites.id, input.inviteId),
            eq(tenantInvites.tenantId, ctx.tenantId)
          )
        )
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" })
      }

      return { success: true }
    }),

  listInvites: tenantProcedure
    .input(listInvitesInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      if (input.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot list other tenants" })
      }

      const items = await db
        .select()
        .from(tenantInvites)
        .where(
          and(
            eq(tenantInvites.tenantId, input.tenantId),
            gt(tenantInvites.expiresAt, new Date())
          )
        )

      return { items }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Switch Tenant
// ─────────────────────────────────────────────────────────────────────────────

const switchRouter = t.router({
  switch: protectedProcedure
    .input(switchTenantInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const member = await db
        .select()
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, input.tenantId),
            eq(tenantMembers.userId, ctx.user.id)
          )
        )
        .limit(1)

      if (!member[0]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this tenant" })
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1)

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
      }

      return { tenant, role: member[0].role }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const multitenantRouter = t.router({
  tenants: tenantsRouter,
  members: membersRouter,
  switch: switchRouter.switch,
})

export type MultitenantRouter = typeof multitenantRouter
