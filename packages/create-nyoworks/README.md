# create-nyoworks

Create a new NYOWORKS project with one command.

## Usage

```bash
npx create-nyoworks my-project
```

## Interactive Setup

The CLI will ask you:

1. **Project name** - Your project's display name
2. **Platforms** - Web, Mobile, Desktop (multi-select)
3. **Features** - Optional features to enable

## What Gets Created

```
my-project/
├── apps/
│   ├── server/          # Hono + tRPC API
│   ├── web/             # Next.js 16 (if selected)
│   ├── mobile/          # Expo SDK 54 (if selected)
│   └── desktop/         # Tauri 2.0 (if selected)
├── packages/
│   ├── api/             # tRPC routers
│   ├── api-client/      # React hooks
│   ├── database/        # Drizzle ORM
│   ├── validators/      # Zod schemas
│   ├── shared/          # Utilities
│   ├── ui/              # shadcn/ui
│   └── assets/          # Images, icons
├── docs/
│   └── bible/           # Project documentation
├── mcp-server/          # AI agent orchestration
└── nyoworks.config.yaml # Project config
```

## Automatic Placeholder Replacement

These placeholders are replaced during project creation:

| Placeholder | Example Value |
|-------------|---------------|
| `${PROJECT_NAME}` | My Project |
| `${PROJECT_CODE}` | MYPR |
| `${PROJECT_SLUG}` | my-project |
| `${DATABASE_NAME}` | my_project_dev |

## Core vs Optional

**Always Included (Core):**
- Authentication (JWT + Argon2id)
- Database (PostgreSQL + Drizzle)
- API (Hono + tRPC)

**Optional Features:**
- Analytics, CRM, Payments, Notifications
- Appointments, Audit, Export, Realtime

## Requirements

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

## License

MIT
