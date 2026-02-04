# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Web (Next.js) │ Mobile (Expo)   │  Desktop (Tauri)       │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                 │                 │
         └────────────────┬┴─────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Layer                               │
│                    (Hono on Edge)                           │
├─────────────────────────────────────────────────────────────┤
│  Auth  │  Users  │  Roles  │  [Feature Routes]             │
└────────┴─────────┴─────────┴────────────────────────────────┘
         │                 │                 │
┌────────▼─────────────────▼─────────────────▼────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  AuthService  │  UserService  │  [Feature Services]        │
└───────────────┴───────────────┴─────────────────────────────┘
         │                 │                 │
┌────────▼─────────────────▼─────────────────▼────────────────┐
│                    Data Layer                                │
├─────────────┬─────────────┬─────────────────────────────────┤
│ PostgreSQL  │   Redis     │   S3                            │
│ (Drizzle)   │   (Cache)   │   (Files)                      │
└─────────────┴─────────────┴─────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 22+ |
| Monorepo | Turborepo + pnpm | 2.x / 9.x |
| Backend | Hono | 4.x |
| Database | PostgreSQL + Drizzle | 16 / 0.38+ |
| Cache | Redis | 7.x |
| Frontend | Next.js | 16+ |
| Styling | Tailwind CSS + shadcn | 4.x |
| Auth | JWT (jose) + Argon2id | - |
| Testing | Vitest + Playwright | - |

## Security Architecture

### Authentication Flow

```
1. User submits credentials
2. Server validates, generates tokens:
   - Access Token (15 min, JWT)
   - Refresh Token (7 days, JWT with jti)
3. Refresh token hash stored in sessions table
4. Client stores tokens (HttpOnly cookies)
5. On expiry, client uses refresh token
6. Server rotates refresh token (single use)
```

### Authorization Flow

```
1. Request arrives with access token
2. Auth middleware verifies JWT
3. Extract: userId, tenantId, role, permissions
4. Set tenant context for RLS
5. RBAC middleware checks permission
6. Service executes with tenant isolation
```

## Deployment Architecture

### Development

```
localhost:3000 (Next.js)
localhost:3001 (Hono API)
localhost:5432 (PostgreSQL)
localhost:6379 (Redis)
```

### Production (AWS)

```
CloudFront CDN
    │
    ├── Vercel (Next.js)
    │
    └── ALB
         │
         └── ECS Fargate (Hono API)
              │
              ├── RDS (PostgreSQL)
              └── ElastiCache (Redis)
```

## Environment Variables

See `.env.example` for full list.

Required:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
