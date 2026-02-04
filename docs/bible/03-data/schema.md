# Database Schema

## Core Tables

### tenants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Tenant name |
| slug | VARCHAR(63) | UNIQUE, NOT NULL | URL-safe identifier |
| domain | VARCHAR(255) | | Custom domain |
| logo | VARCHAR(500) | | Logo URL |
| settings | JSONB | DEFAULT {} | Tenant settings |
| plan | VARCHAR(50) | DEFAULT 'free' | Subscription plan |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK → tenants, NOT NULL | Tenant reference |
| email | VARCHAR(255) | NOT NULL | User email |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| name | VARCHAR(255) | NOT NULL | Display name |
| avatar | VARCHAR(500) | | Avatar URL |
| role_id | UUID | FK → roles | Role reference |
| email_verified | BOOLEAN | DEFAULT false | Verification status |
| last_login_at | TIMESTAMP | | Last login time |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |
| deleted_at | TIMESTAMP | | Soft delete time |

**Indexes:**
- `users_tenant_email_idx` ON (tenant_id, email)
- `users_tenant_idx` ON (tenant_id)

### roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK → tenants, NOT NULL | Tenant reference |
| name | VARCHAR(100) | NOT NULL | Role name |
| description | VARCHAR(500) | | Role description |
| permissions | JSONB | DEFAULT [] | Permission list |
| is_system | BOOLEAN | DEFAULT false | System role flag |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Indexes:**
- `roles_tenant_idx` ON (tenant_id)
- `roles_tenant_name_idx` ON (tenant_id, name)

### sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | User reference |
| token_hash | VARCHAR(64) | UNIQUE, NOT NULL | Hashed refresh token |
| user_agent | VARCHAR(500) | | Browser/device info |
| ip_address | VARCHAR(45) | | Client IP |
| expires_at | TIMESTAMP | NOT NULL | Expiration time |
| created_at | TIMESTAMP | NOT NULL | Creation time |

**Indexes:**
- `sessions_user_idx` ON (user_id)
- `sessions_token_hash_idx` ON (token_hash)
- `sessions_expires_at_idx` ON (expires_at)

## Entity Relationship Diagram

```
┌─────────────┐
│   tenants   │
├─────────────┤
│ id          │◄────────────────┐
│ name        │                 │
│ slug        │     ┌───────────┴───────────┐
│ ...         │     │                       │
└─────────────┘     │                       │
                    │                       │
              ┌─────┴─────┐           ┌─────┴─────┐
              │   users   │           │   roles   │
              ├───────────┤           ├───────────┤
              │ id        │◄──────────│ id        │
              │ tenant_id │           │ tenant_id │
              │ role_id   │──────────►│ name      │
              │ email     │           │ perms     │
              │ ...       │           │ ...       │
              └─────┬─────┘           └───────────┘
                    │
              ┌─────┴─────┐
              │ sessions  │
              ├───────────┤
              │ id        │
              │ user_id   │
              │ token_hash│
              │ ...       │
              └───────────┘
```

## Feature Tables

[Add tables for each enabled feature]
