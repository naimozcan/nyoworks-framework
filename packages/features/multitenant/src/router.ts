// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, publicProcedure, protectedProcedure, tenantProcedure } from "@nyoworks/api"
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
import { MultitenantService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Tenants Router
// ─────────────────────────────────────────────────────────────────────────────

const tenantsRouter = router({
  create: protectedProcedure
    .input(createTenantInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.createTenant(ctx.user.id, input)
    }),

  update: tenantProcedure
    .input(updateTenantInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.updateTenant(input)
    }),

  get: protectedProcedure
    .input(getTenantInput)
    .query(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.getTenant(input.tenantId)
    }),

  getBySlug: publicProcedure
    .input(getTenantBySlugInput)
    .query(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.getTenantBySlug(input.slug)
    }),

  list: protectedProcedure
    .input(listTenantsInput)
    .query(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.listTenants(ctx.user.id, input)
    }),

  delete: tenantProcedure
    .input(deleteTenantInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.deleteTenant(ctx.user.id, input.tenantId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Members Router
// ─────────────────────────────────────────────────────────────────────────────

const membersRouter = router({
  invite: tenantProcedure
    .input(inviteMemberInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.inviteMember(input)
    }),

  remove: tenantProcedure
    .input(removeMemberInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.removeMember(ctx.user.id, input.tenantId, input.userId)
    }),

  updateRole: tenantProcedure
    .input(updateMemberRoleInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.updateMemberRole(input)
    }),

  list: tenantProcedure
    .input(listMembersInput)
    .query(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.listMembers(input)
    }),

  acceptInvite: protectedProcedure
    .input(acceptInviteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.acceptInvite(ctx.user.id, input.token)
    }),

  cancelInvite: tenantProcedure
    .input(cancelInviteInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.cancelInvite(input.inviteId)
    }),

  listInvites: tenantProcedure
    .input(listInvitesInput)
    .query(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db, ctx.tenantId)
      return service.listInvites(input.tenantId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Switch Tenant
// ─────────────────────────────────────────────────────────────────────────────

const switchRouter = router({
  switch: protectedProcedure
    .input(switchTenantInput)
    .mutation(async ({ input, ctx }) => {
      const service = new MultitenantService(ctx.db)
      return service.switchTenant(ctx.user.id, input.tenantId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const multitenantRouter = router({
  tenants: tenantsRouter,
  members: membersRouter,
  switch: switchRouter.switch,
})

export type MultitenantRouter = typeof multitenantRouter
