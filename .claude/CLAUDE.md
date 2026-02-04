# NYOWORKS Framework - Claude Code Rules

> Framework Version: 2.0.0
> Last Updated: 2026-02-03

## Quick Reference

This is the NYOWORKS Framework source repository. For project-specific rules, see the generated project's CLAUDE.md.

## Code Standards

- **NO semicolons**
- **NO comments** (only section dividers: ═══ and ───)
- **Exports at end of file**
- **Code in English**
- **Chat in Turkish**

## Section Dividers

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// Major Section (File header, main sections)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Minor Section (Subsections)
// ─────────────────────────────────────────────────────────────────────────────
```

## MCP Server

Located at `mcp-server/server.py`. Tools:

- Project: `init_project`, `get_status`, `set_phase`, `register_agent`
- Tasks: `create_task`, `get_tasks`, `update_task`
- Locking: `claim_task`, `release_task`, `get_task_lock`, `force_unlock`
- Features: `list_features`, `enable_feature`, `disable_feature`
- Context: `get_project_summary`, `get_bible_section`, `get_task_context`
- Tracking: `add_decision`, `get_decisions`, `log_activity`

## CLI

Located at `cli/nyoworks.py`. Commands:

- `status` - Project status
- `phase` - Phase management
- `task` - Task management (list, create, claim, release, locks, unlock)
- `feature` - Feature management (list, enable, disable, info)
- `bible` - Documentation status
- `decision` - Decision tracking

## Agent Roles

| Role | Bible Sections | Max Tokens |
|------|----------------|------------|
| lead | 00-master, 01-vision, 99-tracking | 32K |
| architect | 00-master, 03-data, 05-api, 07-tech | 24K |
| backend | 03-data, 05-api | 16K |
| frontend | 06-ui | 16K |
| data | 03-data | 8K |
| qa | 99-tracking | 12K |
| devops | 07-tech | 8K |

## Task Locking

**ALWAYS claim a task before working on it:**

```
1. claim_task(task_id, agent_role)
2. Do work
3. release_task(task_id, agent_role)
```

Locks expire after 30 minutes automatically.

## Workflow Phases

1. DISCOVERY - Requirements, feature selection
2. ARCHITECTURE - System design, schemas
3. PLANNING - Task breakdown
4. BACKEND - API implementation
5. FRONTEND - UI implementation
6. QA - Testing
7. DEPLOYMENT - Go live
