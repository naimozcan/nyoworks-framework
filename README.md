# NYOWORKS Framework v2.1

> AI-orchestrated multi-agent framework for building SaaS applications via MCP

## Overview

NYOWORKS Framework is a comprehensive solution for building SaaS applications with:

- **8 Specialized AI Agents** - Orchestrated via MCP (lead, architect, backend, frontend, designer, data, qa, devops)
- **Handoff Protocol** - Context preservation between agent sessions
- **Sub-Phase System** - Granular workflow tracking (BACKEND.IMPL, FRONTEND.PAGES, etc.)
- **Spec-Driven Development** - Minimum viable specs (10-20 lines) before implementation
- **Feature Toggles** - Enable only what you need (build-time)
- **Cross-Platform** - Web (Next.js 16), Mobile (Expo SDK 54), Desktop (Tauri 2.0)
- **Multi-tenancy** - PostgreSQL RLS for data isolation
- **Visual Guidance** - Approved library catalog (charts, animations, icons, etc.)

## Quick Start

```bash
git clone https://github.com/nyoworks/nyoworks-framework.git
cd nyoworks-framework
./setup.sh
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Monorepo | Turborepo + pnpm 9.x |
| Backend | Hono |
| Frontend | Next.js 16 (App Router) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 (ioredis) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | JWT (jose) + Argon2id |
| Mobile | Expo SDK 54 + React Native 0.81 |
| Desktop | Tauri 2.0 |

## AI Workflow

### 8-Phase Pipeline

```
DISCOVERY -> ARCHITECTURE -> DESIGN -> PLANNING -> BACKEND -> FRONTEND -> QA -> DEPLOYMENT
```

### Sub-Phase Granularity (v2.1)

```
BACKEND:  IMPL -> TEST -> REVIEW
FRONTEND: CONTRACT -> PREP -> INFRA -> LAYOUT -> PAGES
QA:       UNIT -> INTEGRATION -> E2E -> SECURITY
```

### Agent Commands

| Command | Role | Description |
|---------|------|-------------|
| /lead | Project Lead | Orchestrates workflow, manages sub-phases |
| /architect | System Architect | Designs systems, cross-platform |
| /backend | Backend Developer | Implements APIs, services |
| /frontend | Frontend Developer | Builds UI, pages |
| /designer | UI/UX Designer | Writes specs, design system |
| /data | Database Engineer | Manages schemas, migrations |
| /qa | QA Engineer | Testing, security audit |
| /devops | DevOps Engineer | Docker, CI/CD, deployment |

## v2.1 Features

### Handoff Protocol
Context preservation between agent sessions. When an agent completes work, it creates a handoff with artifacts, decisions, and warnings for the next agent.

```
create_handoff -> get_pending_handoffs -> acknowledge_handoff
```

### Spec-Driven Development
Based on Addy Osmani "Beyond Vibe Coding" (2026), Martin Fowler SDD Analysis (2025), arXiv SDD paper (2026).

```
get_spec(taskId) -> create_spec() -> approve_spec() -> implement
```

### Visual Guidance
Approved library catalog prevents AI from writing visual elements from scratch.

| Category | Library |
|----------|---------|
| Charts | Recharts (shadcn/ui Charts) |
| Animations | Motion (Framer Motion) |
| Effects | Magic UI / Aceternity UI |
| Icons | Lucide React |
| Tables | TanStack Table (shadcn DataTable) |
| Forms | React Hook Form + Zod (shadcn Form) |

### Real Phase Validation
Automated checks (execSync for tests/build) + manual approval (approve_check for security/staging).

## MCP Server (67+ Tools)

### Core Tools
| Tool | Purpose |
|------|---------|
| `get_status` | Project state overview |
| `create_task` / `get_tasks` / `update_task` | Task management |
| `claim_task` / `release_task` / `heartbeat` | Task locking (30-min timeout) |
| `advance_phase` / `rollback_phase` | Phase management |

### v2.1 Tools (13 new)
| Tool | Purpose |
|------|---------|
| `create_handoff` / `get_pending_handoffs` / `acknowledge_handoff` | Agent context handoff |
| `set_sub_phases` / `get_sub_phase` / `advance_sub_phase` | Sub-phase management |
| `create_spec` / `get_spec` / `approve_spec` / `require_spec` | Spec registry |
| `approve_check` | Manual validation approval |
| `get_visual_guidance` | Visual library catalog |
| `get_shared_architecture` | Cross-platform guidance |

## Directory Structure

```
nyoworks-framework/
├── .claude/commands/      # 8 AI agent definitions (v2.1)
├── mcp-server/            # MCP orchestration server (67+ tools)
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
├── templates/             # Project scaffolding
│   ├── docker/            # Docker configs
│   ├── github-workflows/  # CI/CD workflows
│   └── monorepo/          # Monorepo skeleton
├── workflow/              # Phase/role configs (v2.1 sub-phases)
├── docs/bible/            # Documentation templates
│   ├── ui/                # Page specs, layout, assets (v2.1)
│   ├── infra/             # Cross-platform architecture (v2.1)
│   └── specs/             # SDD documentation (v2.1)
└── config/                # Stack/features config
```

## Academic Validation (February 2026)

Framework decisions validated against 9 authoritative sources:

| Feature | Supporting Sources | Strength |
|---------|-------------------|----------|
| Handoff Protocol | Osmani, Anthropic x2, Google ADK, IBM | STRONG |
| Sub-Phase System | Osmani, Anthropic x2, arXiv | STRONG |
| Spec Registry (10-20 lines) | Osmani, Fowler, arXiv, Anthropic | STRONG |
| Role-based Agent Structure | Anthropic x2, Osmani | STRONG |
| Real Validation (execSync) | Osmani, Anthropic, arXiv | STRONG |

## License

MIT License - Naim Yasir Ozcan (nyoworks)
