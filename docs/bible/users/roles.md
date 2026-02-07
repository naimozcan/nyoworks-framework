# User Roles & Permissions

## Role Hierarchy

```
Owner
  └── Admin
        └── Member
```

## Role Definitions

### Owner

- **Description:** Full system access, tenant management
- **Permissions:** `*` (all)
- **Capabilities:**
  - Manage tenant settings
  - Manage all users
  - Manage billing (if payments enabled)
  - Access all features

### Admin

- **Description:** Administrative access
- **Permissions:**
  - `users:*`
  - `roles:*`
  - `settings:*`
- **Capabilities:**
  - Manage users
  - Assign roles
  - Configure settings

### Member

- **Description:** Standard user access
- **Permissions:**
  - `users:read`
  - `profile:*`
- **Capabilities:**
  - View other users
  - Manage own profile

## Permission Format

```
resource:action

Examples:
- users:read
- users:create
- users:update
- users:delete
- users:*  (all actions on users)
- *        (superuser - all resources)
```

## Feature-Specific Permissions

When features are enabled, additional permissions are available:

### Payments Feature

- `payments:read`
- `payments:create`
- `payments:refund`
- `subscriptions:read`
- `subscriptions:manage`

### Appointments Feature

- `appointments:read`
- `appointments:create`
- `appointments:update`
- `appointments:delete`
- `calendar:read`
- `calendar:manage`

[Continue for each enabled feature...]
