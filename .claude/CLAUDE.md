# NYOWORKS Framework - Claude Code Rules

> Framework Version: 2.6.0
> Last Updated: 2026-02-08

## Quick Reference

This is the NYOWORKS Framework source repository. For project-specific rules, see the generated project's CLAUDE.md.

## Code Standards

- **NO semicolons**
- **NO comments** (only section dividers: ═══ and ───)
- **Exports at end of file** (RFCE pattern)
- **Code in English**
- **Chat in Turkish**
- **NO emojis** in professional communication
- **Zero Warnings**: No compile-time warnings, no peer dependency warnings
- **Type Safety**: Strict TypeScript, no `any`, no `as` casts

## Section Dividers

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// Major Section (File header, main sections)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Minor Section (Subsections)
// ─────────────────────────────────────────────────────────────────────────────
```

## MCP Server (v2.1)

Located at `mcp-server/src/index.ts` (TypeScript). Built output: `mcp-server/dist/index.js`.

### Core Tools
- Project: `init_project`, `get_status`, `set_phase`, `register_agent`, `get_project_summary`
- Tasks: `create_task`, `get_tasks`, `update_task`, `add_task_progress`, `get_task_progress`
- Subtasks: `add_subtask`, `complete_subtask`
- Locking: `claim_task`, `release_task`, `get_task_lock`, `get_all_locks`, `force_unlock`
- Authorization: `validate_work_authorization`, `heartbeat`
- Features: `list_features`, `enable_feature`, `disable_feature`
- Context: `get_bible_sections_for_role`, `get_bible_section`, `get_task_context`
- Decisions: `add_decision`, `get_decisions`, `sync_bible_decisions`
- Activity: `log_activity`, `get_activity_log`, `get_error_log`, `clear_error_log`

### v2.1 Tools
- Handoff: `create_handoff`, `get_pending_handoffs`, `acknowledge_handoff`
- Sub-Phase: `set_sub_phases`, `get_sub_phase`, `advance_sub_phase`
- Spec Registry: `create_spec`, `get_spec`, `approve_spec`, `require_spec`
- Phase Workflow: `get_phase_info`, `validate_phase_transition`, `advance_phase`, `rollback_phase`
- Phase Deliverables: `get_phase_deliverables`, `check_phase_completion`, `get_active_roles_for_phase`, `is_role_active`, `get_workflow_status`
- Validation: `approve_check`
- Visual: `get_visual_guidance`
- Cross-Platform: `get_shared_architecture`
- Cleanup: `check_orphan_code`
- Bible: `get_bible_status`
- Health: `health_check`, `create_backup`, `recover_state`

## CLI

Located at `cli/nyoworks.py`. Commands:

- `status` - Project status
- `phase` - Phase management (list, --set)
- `task` - Task management (list, create, claim, release, locks, unlock)
- `feature` - Feature management (list, enable, disable, info)
- `bible` - Documentation status (status, check)
- `decision` - Decision tracking (list, add)

## Agent Roles (8 Roles)

| Role | Agent Command | Bible Sections |
|------|---------------|----------------|
| lead | `/lead` | product/, _tracking/ |
| architect | `/architect` | product/, data/, api/, infra/ |
| backend | `/backend` | features/, data/, api/ |
| frontend | `/frontend` | features/, ui/ |
| designer | `/designer` | ui/ |
| data | `/data` | data/ |
| qa | `/qa` | quality/, features/ |
| devops | `/devops` | infra/ |

## Workflow Phases (8 Phases)

```
DISCOVERY → ARCHITECTURE → DESIGN → PLANNING → BACKEND → FRONTEND → QA → DEPLOYMENT
    │           │            │          │          │          │       │        │
   lead      architect    designer    lead     backend   frontend    qa     devops
```

### Sub-Phase System (v2.1)
```
BACKEND:  IMPL → TEST → REVIEW
FRONTEND: CONTRACT → PREP → INFRA → LAYOUT → PAGES
QA:       UNIT → INTEGRATION → E2E → SECURITY
```

## Task Locking

**ALWAYS claim a task before working on it:**

```
1. get_pending_handoffs({agentRole})     # Check context from previous agent
2. claim_task({taskId, agentRole})
3. validate_work_authorization({agentRole, action})
4. get_spec({taskId})                     # Check/create spec
5. Do work
6. check_orphan_code()                    # MANDATORY cleanup check
7. create_handoff({...})                  # Pass context to next agent
8. update_task({taskId, status})
9. release_task({taskId, agentRole})
```

Locks expire after 30 minutes automatically.

## Spec-Driven Development (v2.1)

- Every significant task SHOULD have a spec before implementation
- Specs: 10-20 lines max (minimum viable spec)
- Focus on WHAT, not HOW
- No pixel values, no color codes (theme tokens handle those)
- Reference Bible decisions (P-xxx, T-xxx)
- `specRequired` default: false (lead toggles per project)

## Visual Element Rules (v2.1)

NEVER write visual elements from scratch. Use approved libraries:

| Category | Library |
|----------|---------|
| Charts | Recharts (shadcn/ui Charts) |
| Animations | Motion (Framer Motion) |
| Effects | Magic UI / Aceternity UI |
| Icons | Lucide React |
| Loading | Skeleton (shadcn/ui) |
| Tables | TanStack Table (shadcn DataTable) |
| Forms | React Hook Form + Zod (shadcn Form) |

## Cross-Platform Architecture (v2.1)

Shared packages: types, validators, API client, business hooks, constants, utils
Platform-specific: UI components, navigation, styling

| Platform | App | Styling | Navigation |
|----------|-----|---------|------------|
| Web | apps/web/ | Tailwind CSS v4 | Next.js App Router |
| Mobile | apps/mobile/ | NativeWind v4 | Expo Router v6 |
| Desktop | apps/desktop/ | Tailwind CSS v4 | Tauri 2.0 |

## Root File Ban (v2.1)

NEVER create files in the project root. Use MCP tools for tracking:
- Task notes: `add_task_progress`
- Activity: `log_activity`
- Reports: `docs/bible/_reports/{agent}-{date}.md`

After every task: `check_orphan_code()` (MANDATORY)

## Bible Structure (Flat + Semantic)

```
docs/bible/
├── INDEX.md              # Master index
├── DECISIONS.md          # All decisions (P-xxx, T-xxx, B-xxx)
├── product/              # Vision, principles, glossary
├── users/                # Types, verification, roles
├── features/             # Feature specs (polls, surveys, etc.)
├── data/                 # Schema, relationships, quality
├── api/                  # Routes, auth, contracts
├── ui/                   # Flows, components, themes, accessibility
├── infra/                # Architecture, deployment, security
├── quality/              # Test plan, edge cases, coverage
├── specs/                # Spec templates and guidelines
├── _tracking/            # Gaps, changelog, status
└── _reports/             # Agent-generated reports
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Package Manager | pnpm 9.x |
| Monorepo | Turborepo |
| Language | TypeScript 5.7+ |
| API | Hono |
| Database | Drizzle ORM + PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| Auth | JWT (jose) + Argon2id |
| Frontend | Next.js 16, React 19.x |
| Styling | Tailwind CSS 4, shadcn/ui |
| Mobile | Expo SDK 54, React Native 0.81 |
| Desktop | Tauri 2.0 |
| State | TanStack Query v5 |
| Validation | Zod |

## Security Standards

- JWT access tokens (15 min expiry)
- Refresh token rotation (7 day, single use)
- HttpOnly, Secure, SameSite=Strict cookies
- Argon2id for passwords (NOT bcrypt)
- Every endpoint: auth + rate limiting + Zod validation

## Resilience & Recovery (v2.2)

### Health Check
Run `health_check()` to verify:
- State file validity and readability
- Bible directory exists
- Backup availability
- Auto-recovery if state corrupted

### State Backup
- Automatic: State backed up before risky operations
- Manual: `create_backup()` for on-demand backup
- Max 5 backups retained (auto-rotation)
- Recovery: `recover_state()` restores from latest valid backup

### Graceful Degradation
- Corrupted state → Auto-recover from backup
- Missing backup → Reset to defaults
- Invalid JSON → Use defaults, log error
- Retry logic for transient failures
