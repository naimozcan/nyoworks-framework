# NYOWORKS Framework v2.0

> Feature-based, modular SaaS framework with AI team orchestration via MCP

## Overview

NYOWORKS Framework is a comprehensive solution for building SaaS applications with:

- **Feature Toggles** - Enable only what you need (build-time)
- **AI Team Orchestration** - 7 specialized agents via MCP
- **Multi-tenancy** - PostgreSQL RLS for data isolation
- **RBAC** - Role-based access control
- **i18n** - TR/EN/NL support
- **Theming** - Dark/light mode

## Quick Start

```bash
# Clone the framework
git clone https://github.com/nyoworks/nyoworks-framework.git
cd nyoworks-framework

# Create a new project
./setup.sh
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Monorepo | Turborepo + pnpm 9.x |
| Backend | Hono |
| Frontend | Next.js 16+ (Server Actions) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | JWT (jose) + Argon2id |

## Available Features

| Feature | Description |
|---------|-------------|
| payments | Stripe subscriptions |
| appointments | Booking/scheduling |
| inventory | Warehouse management |
| crm | Customer relationship |
| cms | Content management |
| ecommerce | Products/cart/checkout |
| analytics | Dashboards/reports |
| notifications | Push/email alerts |
| audit | Activity logging |
| export | CSV/PDF export |
| realtime | WebSocket features |

## AI Workflow

```
/lead → /architect → /backend + /data → /frontend → /qa → /devops
```

### Agent Commands

| Command | Role | Description |
|---------|------|-------------|
| /lead | Project Lead | Orchestrates workflow |
| /architect | System Architect | Designs systems |
| /backend | Backend Developer | Implements APIs |
| /frontend | Frontend Developer | Builds UI |
| /data | Database Engineer | Manages schemas |
| /qa | QA Engineer | Ensures quality |
| /devops | DevOps Engineer | Handles deployment |

## CLI Commands

```bash
# Project status
nyoworks status

# Phase management
nyoworks phase
nyoworks phase --set BACKEND

# Task management
nyoworks task list
nyoworks task create "Task title" --feature payments
nyoworks task claim TASK-001 --role backend
nyoworks task release TASK-001
nyoworks task locks

# Feature management
nyoworks feature list
nyoworks feature list --enabled
nyoworks feature enable payments
nyoworks feature disable crm
nyoworks feature info payments

# Bible documentation
nyoworks bible status
nyoworks bible check

# Decisions
nyoworks decision list
nyoworks decision add T-001 "Title" "Description" "Rationale"
```

## Directory Structure

```
nyoworks-framework/
├── .claude/commands/      # AI role definitions
├── mcp-server/            # MCP orchestration server
├── cli/                   # CLI tool
├── core/                  # Always-included modules
│   ├── database/          # Schema, RLS
│   ├── validators/        # Zod schemas
│   ├── auth/              # JWT, Argon2id
│   ├── rbac/              # Permissions
│   ├── i18n/              # Translations
│   ├── theme/             # CSS variables
│   └── shared/            # Types, errors, logger
├── features/              # Optional feature modules
├── templates/monorepo/    # Project template
├── workflow/              # Phase/role configs
├── docs/bible/            # Documentation templates
└── config/                # Stack/features config
```

## Bible Documentation

Each project includes a Bible for documentation:

```
docs/bible/
├── 00-master/     # Index, decisions
├── 01-vision/     # Mission, principles
├── 02-actors/     # Users, roles
├── 03-data/       # Schema, models
├── 04-features/   # Feature specs
├── 05-api/        # Endpoints
├── 06-ui/         # Components
├── 07-tech/       # Architecture
└── 99-tracking/   # Gaps, audit
```

## License

MIT License - Naim Yasir Ozcan (nyoworks)
