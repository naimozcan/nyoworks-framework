# @nyoworks/feature-audit

Audit logging feature for NYOWORKS projects. Provides comprehensive database change tracking, audit trails, and user activity monitoring.

## Installation

```bash
pnpm add @nyoworks/feature-audit
```

## Features

- Automatic audit log creation for database changes
- Entity history tracking
- User activity monitoring
- Sensitive field redaction
- Diff computation utilities
- React hooks for audit log retrieval
- tRPC router for API endpoints

## Schema

The audit feature creates an `audit_logs` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant identifier |
| userId | UUID | User who performed the action |
| action | VARCHAR | Action type (create, update, delete, view, etc.) |
| entityType | VARCHAR | Type of entity being audited |
| entityId | VARCHAR | ID of the entity |
| oldValue | JSONB | Previous state (for updates/deletes) |
| newValue | JSONB | New state (for creates/updates) |
| ipAddress | VARCHAR | Client IP address |
| userAgent | TEXT | Client user agent |
| metadata | JSONB | Additional context |
| createdAt | TIMESTAMP | When the action occurred |

## Usage

### Database Schema

```typescript
import { auditLogs } from "@nyoworks/feature-audit/schema"
```

### tRPC Router

```typescript
import { auditRouter } from "@nyoworks/feature-audit/router"

export const appRouter = t.router({
  audit: auditRouter,
})
```

### Middleware

```typescript
import { createAuditLogger, redactSensitiveFields } from "@nyoworks/feature-audit/middleware"

const auditLogger = createAuditLogger(db, {
  tenantId: ctx.tenantId,
  userId: ctx.user.id,
  ipAddress: ctx.req.ip,
  userAgent: ctx.req.headers["user-agent"],
})

await auditLogger.logCreate("user", user.id, redactSensitiveFields(user))
await auditLogger.logUpdate("user", user.id, oldUser, newUser)
await auditLogger.logDelete("user", user.id, user)
```

### React Hooks

```typescript
import { useAuditLogs, useAuditLog, useEntityHistory, useUserActivity, useAuditStats } from "@nyoworks/feature-audit"

function AuditLogList() {
  const { logs, isLoading, fetchLogs, hasMore, loadMore } = useAuditLogs({
    entityType: "user",
    limit: 20,
  })

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div>
      {logs.map(log => (
        <div key={log.id}>
          {log.action} {log.entityType} {log.entityId}
        </div>
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  )
}
```

## Action Types

- `create` - Entity created
- `update` - Entity updated
- `delete` - Entity deleted
- `view` - Entity viewed
- `export` - Data exported
- `import` - Data imported
- `login` - User logged in
- `logout` - User logged out
- `permission_change` - Permissions modified
- `setting_change` - Settings modified

## Sensitive Field Redaction

The middleware automatically redacts common sensitive fields:

- password, passwordHash
- token, accessToken, refreshToken
- apiKey, secret, secretKey, privateKey
- ssn, creditCard, cardNumber

You can add custom fields to redact:

```typescript
redactSensitiveFields(data, ["customSecret", "internalId"])
```

## Diff Computation

Compute differences between old and new values:

```typescript
import { computeDiff } from "@nyoworks/feature-audit/middleware"

const { changed, added, removed } = computeDiff(oldValue, newValue)
```

## API Endpoints

The tRPC router exposes:

- `audit.log` - Create an audit log entry
- `audit.list` - List audit logs with filters
- `audit.get` - Get a single audit log
- `audit.getEntityHistory` - Get history for a specific entity
- `audit.getUserActivity` - Get activity for a specific user
- `audit.getStats` - Get audit statistics

## License

MIT
