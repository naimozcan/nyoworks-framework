# @nyoworks/feature-multitenant

Multitenant feature module for NYOWORKS projects. Provides tenant management, member management, and invite system.

## Installation

```bash
pnpm add @nyoworks/feature-multitenant
```

## Features

- Tenant CRUD operations
- Member management with role-based access
- Invite system with expiring tokens
- Tenant context middleware
- React hooks for client-side usage

## Database Schema

### Tables

- **tenants** - Organization/workspace entities
  - id, name, slug, domain, settings, plan, status, createdAt, updatedAt

- **tenant_members** - User memberships in tenants
  - id, tenantId, userId, role, invitedAt, joinedAt

- **tenant_invites** - Pending invitations
  - id, tenantId, email, role, token, expiresAt, createdAt

## Usage

### Schema

```typescript
import { tenants, tenantMembers, tenantInvites } from "@nyoworks/feature-multitenant/schema"
```

### Router (tRPC)

```typescript
import { multitenantRouter } from "@nyoworks/feature-multitenant/router"

export const appRouter = router({
  multitenant: multitenantRouter,
})
```

### Middleware

```typescript
import { resolveTenant, getDefaultTenant, hasPermission } from "@nyoworks/feature-multitenant/middleware"

const result = await resolveTenant({
  db,
  userId: user.id,
  headerTenantId: req.headers["x-tenant-id"],
})

if (result.success) {
  ctx.tenantId = result.context.tenantId
  ctx.tenantPlan = result.context.tenantPlan
}
```

### React Hooks

```tsx
import { TenantProvider, useTenant, useTenants, useTenantMembers, useTenantSwitch } from "@nyoworks/feature-multitenant"

function App() {
  return (
    <TenantProvider>
      <Dashboard />
    </TenantProvider>
  )
}

function Dashboard() {
  const { tenant, role, isLoading } = useTenant()
  const { switchTenant } = useTenantSwitch()
  const { tenants, fetchTenants, createTenant } = useTenants()
  const { members, inviteMember, removeMember } = useTenantMembers(tenant?.id)

  // ...
}
```

## Roles and Permissions

| Role | read | write | admin | owner |
|------|------|-------|-------|-------|
| owner | x | x | x | x |
| admin | x | x | x | |
| member | x | x | | |
| viewer | x | | | |

## Validators

```typescript
import {
  createTenantInput,
  updateTenantInput,
  inviteMemberInput,
  removeMemberInput,
  switchTenantInput,
} from "@nyoworks/feature-multitenant"
```

## API Endpoints

When integrated with tRPC:

- `multitenant.tenants.create` - Create new tenant
- `multitenant.tenants.update` - Update tenant settings
- `multitenant.tenants.get` - Get tenant by ID
- `multitenant.tenants.getBySlug` - Get tenant by slug
- `multitenant.tenants.list` - List user's tenants
- `multitenant.tenants.delete` - Delete tenant (owner only)
- `multitenant.members.invite` - Send member invite
- `multitenant.members.remove` - Remove member
- `multitenant.members.updateRole` - Update member role
- `multitenant.members.list` - List tenant members
- `multitenant.members.acceptInvite` - Accept invite token
- `multitenant.members.cancelInvite` - Cancel pending invite
- `multitenant.members.listInvites` - List pending invites
- `multitenant.switch` - Switch active tenant

## License

MIT
