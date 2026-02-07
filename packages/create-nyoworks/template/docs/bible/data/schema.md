# Database Schema

## Project: ${PROJECT_NAME}

> This file defines the database schema for the project.
> Update this document as you design your data model.

---

## Core Tables

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password | VARCHAR(255) | NOT NULL | Hashed password (Argon2id) |
| name | VARCHAR(255) | NOT NULL | Display name |
| avatar | VARCHAR(500) | | Avatar URL |
| email_verified | BOOLEAN | DEFAULT false | Verification status |
| last_login_at | TIMESTAMP | | Last login time |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |
| deleted_at | TIMESTAMP | | Soft delete time |

**Indexes:**
- `users_email_idx` ON (email)

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

---

## Feature Tables

> Add tables for each enabled feature below.
> Follow the naming conventions and index patterns above.

### [feature_name]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| ... | ... | ... | ... |

---

## Entity Relationship Diagram

```
┌─────────────┐
│   users     │
├─────────────┤
│ id          │◄────────────────┐
│ email       │                 │
│ password    │                 │
│ name        │                 │
│ ...         │                 │
└─────────────┘                 │
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

---

## Multi-Tenancy (Optional)

> If your project requires multi-tenancy, add a `tenants` table
> and add `tenant_id` foreign key to all relevant tables.

### tenants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Tenant name |
| slug | VARCHAR(63) | UNIQUE, NOT NULL | URL-safe identifier |
| settings | JSONB | DEFAULT {} | Tenant settings |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |

---

## Migration Notes

- All tables use UUID primary keys
- Timestamps use TIMESTAMP WITH TIME ZONE
- Soft deletes via `deleted_at` column where applicable
- JSONB for flexible nested data
