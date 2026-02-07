# Project Decisions

> Record all technical and business decisions here

## Decision Format

```
## [ID] Title

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated
**Deciders:** Role/Person

### Context
What is the issue that we're seeing that is motivating this decision?

### Decision
What is the change that we're proposing/making?

### Rationale
Why is this the best choice?

### Consequences
What becomes easier or more difficult?
```

---

## Decisions

### [T-001] Tech Stack Selection

**Date:** ${DATE}
**Status:** Accepted
**Deciders:** Lead

#### Context
Need to select a tech stack for the project.

#### Decision
- Backend: Hono + Drizzle ORM + PostgreSQL
- Frontend: Next.js 16 + Server Actions
- Auth: JWT (jose) + Argon2id
- Styling: Tailwind CSS 4 + shadcn/ui

#### Rationale
Industry-standard, performant, type-safe stack with good DX.

#### Consequences
- Team needs to learn Hono if unfamiliar
- Drizzle ORM provides better type safety than Prisma

---

### [P-001] Multi-tenancy Approach

**Date:** ${DATE}
**Status:** Accepted
**Deciders:** Architect

#### Context
Need to support multiple tenants in a single database.

#### Decision
Use PostgreSQL Row-Level Security (RLS) with tenant_id column.

#### Rationale
- Data isolation at database level
- No application-level filtering required
- Secure by default

#### Consequences
- All queries automatically filtered
- RLS policies must be maintained
- Slightly more complex schema

---
