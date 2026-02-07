# NYOWORKS Shared Agent Protocol

> This file contains shared rules for ALL agents. Each agent MUST follow these rules in addition to their role-specific instructions.

## FILE RULES (CRITICAL)

- **NEVER create files in project root** (no TASKS-*.md, NOTES-*.md, etc.)
- Task tracking: Use MCP `create_task`, `update_task`, `get_tasks` tools
- **Progress notes**: Use MCP `add_task_progress` tool (NOT new files)
- **Modular work**: Use `add_subtask` and `complete_subtask` for long tasks
- Reports: Save to `docs/bible/_reports/{agent}-{date}.md`
- Temporary notes: Use MCP `log_activity` tool
- If you need to track work, use MCP - NOT files in root

## MCP AVAILABILITY CHECK (CRITICAL - FIRST STEP)

Before ANY work, verify MCP is available:

```
mcp__nyoworks__get_status()
```

**If MCP tools are NOT available (tool not found error):**

1. **DO NOT** scan the project manually
2. **DO NOT** try to work without MCP
3. **IMMEDIATELY** inform the user with this exact message:

```
MCP server erisilebildi degil. Lutfen asagidaki adimlari takip edin:

1. MCP server'i build edin:
   cd mcp-server && pnpm install && pnpm build

2. Claude Code'u yeniden baslatin:
   claude

3. Tekrar deneyin:
   /lead (veya diger agent)

Yardim: https://github.com/naimozcan/nyoworks-framework#mcp-setup
```

4. **STOP** - Do not proceed further

**If MCP is available, continue with the workflow below.**

## MCP TOOL SEQUENCE (REQUIRED - NO EXCEPTIONS)

### Step 1: On Invocation
```
mcp__nyoworks__get_status()
mcp__nyoworks__is_role_active({role: "{ROLE}"})
```

### Step 2: Check Handoffs (v2.1)
```
mcp__nyoworks__get_pending_handoffs({agentRole: "{ROLE}"})
-> If handoffs exist: mcp__nyoworks__acknowledge_handoff({handoffId, agentRole: "{ROLE}"})
```

### Step 3: Check Sub-Phase (v2.1)
```
mcp__nyoworks__get_sub_phase()
```

### Step 4: Get and Claim Task
```
mcp__nyoworks__get_tasks({status: "pending"})
mcp__nyoworks__claim_task({taskId: "TASK-xxx", agentRole: "{ROLE}"})
```

### Step 5: Authorize Work (MANDATORY - BEFORE ANY CODE)
```
mcp__nyoworks__validate_work_authorization({agentRole: "{ROLE}", action: "implement"})
# If NOT authorized -> STOP. Do NOT write any code.
```

### Step 6: Check Spec (v2.1)
```
mcp__nyoworks__get_spec({taskId: "TASK-xxx"})
-> If no spec: create_spec({taskId, type, title, content, bibleRefs})
-> Wait for lead/architect approval before implementing
```

### Step 7: During Long Tasks
```
mcp__nyoworks__complete_subtask({taskId, subTaskId})
mcp__nyoworks__add_task_progress({taskId, note, percentage})
mcp__nyoworks__get_task_progress({taskId})  # Resume after context reset
```

### Step 8: After Work
```
mcp__nyoworks__check_orphan_code()                  # MANDATORY
mcp__nyoworks__create_handoff({fromAgent, toAgent, summary, artifacts, decisions, warnings})
mcp__nyoworks__update_task({taskId, status: "completed"})
mcp__nyoworks__release_task({taskId, agentRole: "{ROLE}"})
mcp__nyoworks__log_activity({agent: "{ROLE}", action: "task_completed", details: "..."})
```

## CRITICAL RULE

**YOU CANNOT WRITE ANY CODE WITHOUT A CLAIMED TASK.**

If `validate_work_authorization` returns `authorized: false`:
1. DO NOT write any code
2. DO NOT create any files
3. Inform the user that a task must be created first
4. Ask /lead to create appropriate tasks

## PLAN MODE WORKFLOW

When in **Plan Mode**, follow this exact workflow:

### 1. Create the Plan
Analyze requirements, research existing code, design approach, write plan to plan file.

### 2. Convert Plan to MCP Tasks (MANDATORY)
```
mcp__nyoworks__create_task({
  title: "Task title",
  description: "Detailed description",
  feature: "feature_name",
  priority: "high",
  subTasks: ["Step 1", "Step 2", "Step 3"]
})
```

### 3. Request Approval (MANDATORY)
**DO NOT** start implementing. Instead, output:
```
PLAN TAMAMLANDI
---------------
Olusturulan Tasklar:
- TASK-001: [Title] (X subtask)
- TASK-002: [Title] (Y subtask)

Toplam: N task, M subtask

Plan modunu kapatip implementasyona gecmemi onaylar misiniz?
```

### 4. Wait for User Confirmation
- User says "evet/onay/devam" -> Exit plan mode, start implementation
- User says "hayir/degistir" -> Modify tasks as requested
- **NEVER start implementation without explicit user approval.**

## SPEC RULES (v2.1)

- Keep specs 10-20 lines (Martin Fowler: "minimum viable spec")
- Focus on WHAT, not HOW
- Reference Bible decisions (P-xxx, T-xxx)
- No pixel values, no color codes - those come from theme tokens

## UNIVERSAL CONSTRAINTS

- NO semicolons
- NO comments (only section dividers: `// ═══` and `// ───`)
- Exports at END of file (RFCE pattern)
- English code, Turkish explanations
- NO `any` types, NO `as` casts

## ERROR RECOVERY

```
On Task Timeout (30 min):
  1. Task auto-releases
  2. Re-claim if still working
  3. Break into smaller tasks if too large
```

## HEALTH CHECK (v2.2)

Before starting complex work, run health check:
```
mcp__nyoworks__health_check()
```

This verifies:
- State file is valid and readable
- Bible directory exists
- Backups are available
- Auto-recovers corrupted state

For manual backup before risky operations:
```
mcp__nyoworks__create_backup()
```

For recovery from corrupted state:
```
mcp__nyoworks__recover_state()
```

## REPORT OUTPUT

When generating reports, write them to:
```
docs/bible/_reports/{agent}-{date}.md
```
Do NOT output long reports in chat - save to file and provide summary.

## RESPONSE LANGUAGE

- Explanations: ${RESPONSE_LANGUAGE}
- Code: English
- Comments: NONE (section dividers only)
