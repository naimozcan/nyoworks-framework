// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - State Management & Tool Logic Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs"
import { join } from "path"

// ─────────────────────────────────────────────────────────────────────────────
// Test State Manager (mirrors MCP server state logic)
// ─────────────────────────────────────────────────────────────────────────────

const TEST_DIR = join(import.meta.dirname ?? ".", ".test-state")
const STATE_FILE = join(TEST_DIR, "state.json")

interface TaskLock {
  taskId: string
  agentRole: string
  claimedAt: string
  expiresAt: string
  lastHeartbeat: string
}

interface SubTask {
  id: string
  title: string
  status: "pending" | "completed"
  completedAt: string | null
}

interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "blocked"
  assignee: string | null
  feature: string | null
  priority: "low" | "medium" | "high" | "critical"
  createdAt: string
  updatedAt: string
  completedAt: string | null
  progress: { timestamp: string; note: string; percentage: number }[]
  subTasks: SubTask[]
}

interface State {
  project: { name: string; code: string; phase: string }
  tasks: Task[]
  locks: TaskLock[]
  decisions: { id: string; title: string; description: string; rationale: string; createdAt: string }[]
  activityLog: { timestamp: string; agent: string; action: string; details: string }[]
  errorLog: { timestamp: string; tool: string; error: string; args: Record<string, unknown> }[]
  handoffs: {
    id: string; fromAgent: string; toAgent: string; summary: string
    status: "pending" | "acknowledged"; createdAt: string
    artifacts: string[]; decisions: string[]; warnings: string[]
  }[]
  specs: Record<string, unknown>[]
}

function createEmptyState(): State {
  return {
    project: { name: "TestProject", code: "TEST", phase: "BACKEND" },
    tasks: [],
    locks: [],
    decisions: [],
    activityLog: [],
    errorLog: [],
    handoffs: [],
    specs: [],
  }
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) return createEmptyState()
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"))
}

function saveState(state: State): void {
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Logic (mirrors MCP server)
// ─────────────────────────────────────────────────────────────────────────────

function createTask(state: State, title: string, description = "", feature: string | null = null, priority: "low" | "medium" | "high" | "critical" = "medium", subTaskTitles: string[] = []): Task {
  const taskNum = state.tasks.length + 1
  const taskId = `TASK-${String(taskNum).padStart(3, "0")}`
  const now = new Date().toISOString()

  const subTasks: SubTask[] = subTaskTitles.map((st, i) => ({
    id: `${taskId}-SUB-${String(i + 1).padStart(2, "0")}`,
    title: st,
    status: "pending" as const,
    completedAt: null,
  }))

  const task: Task = {
    id: taskId,
    title,
    description,
    status: "pending",
    assignee: null,
    feature,
    priority,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    progress: [],
    subTasks,
  }

  state.tasks.push(task)
  return task
}

function claimTask(state: State, taskId: string, agentRole: string): { success: boolean; error?: string } {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) return { success: false, error: `Task ${taskId} not found` }

  const existingLock = state.locks.find((l) => l.taskId === taskId)
  if (existingLock) {
    const now = new Date()
    const expires = new Date(existingLock.expiresAt)
    if (now < expires) {
      return { success: false, error: `Task ${taskId} is locked by ${existingLock.agentRole}` }
    }
    state.locks = state.locks.filter((l) => l.taskId !== taskId)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

  state.locks.push({
    taskId,
    agentRole,
    claimedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastHeartbeat: now.toISOString(),
  })

  task.status = "in_progress"
  task.assignee = agentRole
  task.updatedAt = now.toISOString()

  return { success: true }
}

function releaseTask(state: State, taskId: string, agentRole: string): { success: boolean; error?: string } {
  const lockIndex = state.locks.findIndex((l) => l.taskId === taskId && l.agentRole === agentRole)
  if (lockIndex === -1) return { success: false, error: `No lock found for ${taskId} by ${agentRole}` }

  state.locks.splice(lockIndex, 1)
  return { success: true }
}

function heartbeat(state: State, taskId: string, agentRole: string): { success: boolean; error?: string } {
  const lock = state.locks.find((l) => l.taskId === taskId && l.agentRole === agentRole)
  if (!lock) return { success: false, error: `No lock found for ${taskId}` }

  const now = new Date()
  lock.lastHeartbeat = now.toISOString()
  lock.expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  return { success: true }
}

function completeSubTask(state: State, taskId: string, subTaskId: string): { success: boolean; percentage?: number; error?: string } {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) return { success: false, error: `Task ${taskId} not found` }

  const subTask = task.subTasks.find((st) => st.id === subTaskId)
  if (!subTask) return { success: false, error: `SubTask ${subTaskId} not found` }

  subTask.status = "completed"
  subTask.completedAt = new Date().toISOString()

  const completed = task.subTasks.filter((st) => st.status === "completed").length
  const total = task.subTasks.length
  const percentage = Math.round((completed / total) * 100)

  return { success: true, percentage }
}

function createHandoff(state: State, fromAgent: string, toAgent: string, summary: string): string {
  const id = `HO-${String(state.handoffs.length + 1).padStart(3, "0")}`
  state.handoffs.push({
    id,
    fromAgent,
    toAgent,
    summary,
    status: "pending",
    createdAt: new Date().toISOString(),
    artifacts: [],
    decisions: [],
    warnings: [],
  })
  return id
}

function acknowledgeHandoff(state: State, handoffId: string, agentRole: string): { success: boolean; error?: string } {
  const handoff = state.handoffs.find((h) => h.id === handoffId)
  if (!handoff) return { success: false, error: `Handoff ${handoffId} not found` }
  if (handoff.toAgent !== agentRole && handoff.toAgent !== "*") {
    return { success: false, error: `Handoff ${handoffId} is not for ${agentRole}` }
  }
  handoff.status = "acknowledged"
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Logic
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_ORDER = ["DISCOVERY", "ARCHITECTURE", "DESIGN", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"]

const PHASE_ACTIVE_ROLES: Record<string, { primary: string[]; support: string[] }> = {
  DISCOVERY: { primary: ["lead"], support: [] },
  ARCHITECTURE: { primary: ["architect"], support: ["lead", "data"] },
  DESIGN: { primary: ["designer"], support: ["lead", "frontend"] },
  PLANNING: { primary: ["lead"], support: ["architect"] },
  BACKEND: { primary: ["backend"], support: ["data"] },
  FRONTEND: { primary: ["frontend"], support: ["designer"] },
  QA: { primary: ["qa"], support: ["backend", "frontend", "devops"] },
  DEPLOYMENT: { primary: ["devops"], support: ["lead"] },
}

function isRoleActive(phase: string, role: string): boolean {
  const roles = PHASE_ACTIVE_ROLES[phase]
  if (!roles) return false
  return roles.primary.includes(role) || roles.support.includes(role)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("State Management", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  it("should create empty state with correct structure", () => {
    expect(state.project.name).toBe("TestProject")
    expect(state.project.phase).toBe("BACKEND")
    expect(state.tasks).toHaveLength(0)
    expect(state.locks).toHaveLength(0)
  })

  it("should persist and load state from file", () => {
    state.project.name = "Persisted"
    saveState(state)
    const loaded = loadState()
    expect(loaded.project.name).toBe("Persisted")
  })
})

describe("Task Management", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
  })

  it("should create task with sequential ID", () => {
    const task1 = createTask(state, "First Task")
    const task2 = createTask(state, "Second Task")
    expect(task1.id).toBe("TASK-001")
    expect(task2.id).toBe("TASK-002")
    expect(state.tasks).toHaveLength(2)
  })

  it("should create task with subtasks", () => {
    const task = createTask(state, "Complex Task", "Description", "auth", "high", [
      "Step 1",
      "Step 2",
      "Step 3",
    ])
    expect(task.subTasks).toHaveLength(3)
    expect(task.subTasks[0].id).toBe("TASK-001-SUB-01")
    expect(task.subTasks[2].id).toBe("TASK-001-SUB-03")
    expect(task.subTasks[0].status).toBe("pending")
  })

  it("should set correct defaults on new task", () => {
    const task = createTask(state, "Test")
    expect(task.status).toBe("pending")
    expect(task.assignee).toBeNull()
    expect(task.completedAt).toBeNull()
    expect(task.priority).toBe("medium")
    expect(task.progress).toHaveLength(0)
  })
})

describe("Task Locking", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
    createTask(state, "Test Task")
  })

  it("should claim task successfully", () => {
    const result = claimTask(state, "TASK-001", "backend")
    expect(result.success).toBe(true)
    expect(state.locks).toHaveLength(1)
    expect(state.locks[0].agentRole).toBe("backend")
    expect(state.tasks[0].status).toBe("in_progress")
    expect(state.tasks[0].assignee).toBe("backend")
  })

  it("should reject double claim", () => {
    claimTask(state, "TASK-001", "backend")
    const result = claimTask(state, "TASK-001", "frontend")
    expect(result.success).toBe(false)
    expect(result.error).toContain("locked by backend")
  })

  it("should allow claim on expired lock", () => {
    claimTask(state, "TASK-001", "backend")
    state.locks[0].expiresAt = new Date(Date.now() - 1000).toISOString()
    const result = claimTask(state, "TASK-001", "frontend")
    expect(result.success).toBe(true)
    expect(state.locks[0].agentRole).toBe("frontend")
  })

  it("should release task by owner", () => {
    claimTask(state, "TASK-001", "backend")
    const result = releaseTask(state, "TASK-001", "backend")
    expect(result.success).toBe(true)
    expect(state.locks).toHaveLength(0)
  })

  it("should reject release by non-owner", () => {
    claimTask(state, "TASK-001", "backend")
    const result = releaseTask(state, "TASK-001", "frontend")
    expect(result.success).toBe(false)
  })

  it("should return error for nonexistent task", () => {
    const result = claimTask(state, "TASK-999", "backend")
    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  it("should extend lock via heartbeat", () => {
    claimTask(state, "TASK-001", "backend")
    const originalExpiry = state.locks[0].expiresAt
    heartbeat(state, "TASK-001", "backend")
    expect(new Date(state.locks[0].expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(originalExpiry).getTime())
  })

  it("should reject heartbeat for non-owned lock", () => {
    claimTask(state, "TASK-001", "backend")
    const result = heartbeat(state, "TASK-001", "frontend")
    expect(result.success).toBe(false)
  })
})

describe("SubTask Management", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
    createTask(state, "Complex", "", null, "high", ["Sub 1", "Sub 2", "Sub 3", "Sub 4"])
  })

  it("should complete subtask and calculate percentage", () => {
    const result = completeSubTask(state, "TASK-001", "TASK-001-SUB-01")
    expect(result.success).toBe(true)
    expect(result.percentage).toBe(25)
  })

  it("should reach 100% when all subtasks complete", () => {
    completeSubTask(state, "TASK-001", "TASK-001-SUB-01")
    completeSubTask(state, "TASK-001", "TASK-001-SUB-02")
    completeSubTask(state, "TASK-001", "TASK-001-SUB-03")
    const result = completeSubTask(state, "TASK-001", "TASK-001-SUB-04")
    expect(result.percentage).toBe(100)
  })

  it("should reject invalid subtask ID", () => {
    const result = completeSubTask(state, "TASK-001", "TASK-001-SUB-99")
    expect(result.success).toBe(false)
  })

  it("should reject invalid task ID", () => {
    const result = completeSubTask(state, "TASK-999", "TASK-999-SUB-01")
    expect(result.success).toBe(false)
  })
})

describe("Handoff Protocol", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
  })

  it("should create handoff with sequential ID", () => {
    const id1 = createHandoff(state, "backend", "frontend", "API endpoints ready")
    const id2 = createHandoff(state, "frontend", "qa", "UI components ready")
    expect(id1).toBe("HO-001")
    expect(id2).toBe("HO-002")
    expect(state.handoffs).toHaveLength(2)
    expect(state.handoffs[0].status).toBe("pending")
  })

  it("should acknowledge handoff by target agent", () => {
    createHandoff(state, "backend", "frontend", "Test")
    const result = acknowledgeHandoff(state, "HO-001", "frontend")
    expect(result.success).toBe(true)
    expect(state.handoffs[0].status).toBe("acknowledged")
  })

  it("should reject acknowledgment by wrong agent", () => {
    createHandoff(state, "backend", "frontend", "Test")
    const result = acknowledgeHandoff(state, "HO-001", "qa")
    expect(result.success).toBe(false)
  })

  it("should allow broadcast handoff acknowledgment", () => {
    createHandoff(state, "lead", "*", "Phase transition")
    const result = acknowledgeHandoff(state, "HO-001", "backend")
    expect(result.success).toBe(true)
  })

  it("should return error for nonexistent handoff", () => {
    const result = acknowledgeHandoff(state, "HO-999", "backend")
    expect(result.success).toBe(false)
  })
})

describe("Phase & Role Management", () => {
  it("should validate DISCOVERY phase roles", () => {
    expect(isRoleActive("DISCOVERY", "lead")).toBe(true)
    expect(isRoleActive("DISCOVERY", "backend")).toBe(false)
  })

  it("should validate BACKEND phase roles", () => {
    expect(isRoleActive("BACKEND", "backend")).toBe(true)
    expect(isRoleActive("BACKEND", "data")).toBe(true)
    expect(isRoleActive("BACKEND", "frontend")).toBe(false)
  })

  it("should validate QA phase has most support roles", () => {
    expect(isRoleActive("QA", "qa")).toBe(true)
    expect(isRoleActive("QA", "backend")).toBe(true)
    expect(isRoleActive("QA", "frontend")).toBe(true)
    expect(isRoleActive("QA", "devops")).toBe(true)
    expect(isRoleActive("QA", "designer")).toBe(false)
  })

  it("should have 8 phases", () => {
    expect(PHASE_ORDER).toHaveLength(8)
    expect(PHASE_ORDER[0]).toBe("DISCOVERY")
    expect(PHASE_ORDER[7]).toBe("DEPLOYMENT")
  })

  it("should return false for unknown phase", () => {
    expect(isRoleActive("UNKNOWN", "lead")).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Decision Parsing Tests
// ═══════════════════════════════════════════════════════════════════════════════

function parseDecisionsFromMarkdown(content: string): { id: string; title: string; description: string; rationale: string; createdAt: string }[] {
  const decisions: { id: string; title: string; description: string; rationale: string; createdAt: string }[] = []
  const lines = content.split("\n")
  let currentDecision: { id?: string; title?: string; description?: string; rationale?: string } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(/^###\s+(P-\d+|T-\d+|B-\d+):\s+(.+)$/)
    if (headerMatch) {
      if (currentDecision && currentDecision.id) {
        decisions.push({
          id: currentDecision.id,
          title: currentDecision.title || "",
          description: currentDecision.description || "",
          rationale: currentDecision.rationale || "",
          createdAt: new Date().toISOString(),
        })
      }
      currentDecision = { id: headerMatch[1], title: headerMatch[2].trim() }
      continue
    }
    if (currentDecision) {
      const decisionMatch = line.match(/^-\s+\*\*Decision\*\*:\s+(.+)$/)
      if (decisionMatch) { currentDecision.description = decisionMatch[1].trim(); continue }
      const rationaleMatch = line.match(/^-\s+\*\*Rationale\*\*:\s+(.+)$/)
      if (rationaleMatch) { currentDecision.rationale = rationaleMatch[1].trim(); continue }
    }
  }
  if (currentDecision && currentDecision.id) {
    decisions.push({
      id: currentDecision.id,
      title: currentDecision.title || "",
      description: currentDecision.description || "",
      rationale: currentDecision.rationale || "",
      createdAt: new Date().toISOString(),
    })
  }
  return decisions
}

describe("Decision Parsing", () => {
  it("should parse single decision from markdown", () => {
    const md = `### P-001: Each poll has one question
- **Decision**: One question per poll, no multi-question
- **Rationale**: Keeps the UX simple`
    const decisions = parseDecisionsFromMarkdown(md)
    expect(decisions).toHaveLength(1)
    expect(decisions[0].id).toBe("P-001")
    expect(decisions[0].title).toBe("Each poll has one question")
    expect(decisions[0].description).toBe("One question per poll, no multi-question")
    expect(decisions[0].rationale).toBe("Keeps the UX simple")
  })

  it("should parse multiple decisions", () => {
    const md = `### P-001: First
- **Decision**: Desc 1
- **Rationale**: Reason 1

### T-006: Second
- **Decision**: Desc 2
- **Rationale**: Reason 2

### B-001: Third
- **Decision**: Desc 3
- **Rationale**: Reason 3`
    const decisions = parseDecisionsFromMarkdown(md)
    expect(decisions).toHaveLength(3)
    expect(decisions[0].id).toBe("P-001")
    expect(decisions[1].id).toBe("T-006")
    expect(decisions[2].id).toBe("B-001")
  })

  it("should handle missing fields gracefully", () => {
    const md = `### P-001: Only title
Some random text`
    const decisions = parseDecisionsFromMarkdown(md)
    expect(decisions).toHaveLength(1)
    expect(decisions[0].description).toBe("")
    expect(decisions[0].rationale).toBe("")
  })

  it("should return empty array for no decisions", () => {
    const md = `# Just a heading\nSome paragraph text.`
    const decisions = parseDecisionsFromMarkdown(md)
    expect(decisions).toHaveLength(0)
  })

  it("should ignore non-decision headers", () => {
    const md = `### Not a decision header
### X-001: Wrong prefix
### P-001: Valid one
- **Decision**: Yes`
    const decisions = parseDecisionsFromMarkdown(md)
    expect(decisions).toHaveLength(1)
    expect(decisions[0].id).toBe("P-001")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Lock Expiration Tests
// ═══════════════════════════════════════════════════════════════════════════════

function cleanupExpiredLocks(state: State): string[] {
  const now = new Date()
  const expired: string[] = []
  for (const lock of state.locks) {
    if (new Date(lock.expiresAt) < now) {
      expired.push(lock.taskId)
    }
  }
  state.locks = state.locks.filter((l) => !expired.includes(l.taskId))
  return expired
}

describe("Lock Expiration Cleanup", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
  })

  it("should remove expired locks", () => {
    state.locks.push({
      taskId: "TASK-001",
      agentRole: "backend",
      claimedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      lastHeartbeat: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    })
    const expired = cleanupExpiredLocks(state)
    expect(expired).toHaveLength(1)
    expect(expired[0]).toBe("TASK-001")
    expect(state.locks).toHaveLength(0)
  })

  it("should keep active locks", () => {
    state.locks.push({
      taskId: "TASK-001",
      agentRole: "backend",
      claimedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      lastHeartbeat: new Date().toISOString(),
    })
    const expired = cleanupExpiredLocks(state)
    expect(expired).toHaveLength(0)
    expect(state.locks).toHaveLength(1)
  })

  it("should handle mixed expired and active locks", () => {
    state.locks.push(
      {
        taskId: "TASK-001",
        agentRole: "backend",
        claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        lastHeartbeat: new Date().toISOString(),
      },
      {
        taskId: "TASK-002",
        agentRole: "frontend",
        claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        lastHeartbeat: new Date().toISOString(),
      },
    )
    const expired = cleanupExpiredLocks(state)
    expect(expired).toHaveLength(1)
    expect(expired[0]).toBe("TASK-001")
    expect(state.locks).toHaveLength(1)
    expect(state.locks[0].taskId).toBe("TASK-002")
  })

  it("should return empty array when no locks exist", () => {
    const expired = cleanupExpiredLocks(state)
    expect(expired).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Error Log Rotation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Error Log Rotation", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
  })

  it("should add error log entry", () => {
    state.errorLog.push({
      timestamp: new Date().toISOString(),
      tool: "claim_task",
      error: "Task not found",
      args: { taskId: "TASK-999" },
    })
    expect(state.errorLog).toHaveLength(1)
    expect(state.errorLog[0].tool).toBe("claim_task")
  })

  it("should rotate logs when exceeding 100 entries", () => {
    for (let i = 0; i < 105; i++) {
      state.errorLog.push({
        timestamp: new Date().toISOString(),
        tool: `tool_${i}`,
        error: `Error ${i}`,
        args: {},
      })
    }
    if (state.errorLog.length > 100) {
      state.errorLog = state.errorLog.slice(-100)
    }
    expect(state.errorLog).toHaveLength(100)
    expect(state.errorLog[0].tool).toBe("tool_5")
    expect(state.errorLog[99].tool).toBe("tool_104")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Spec Workflow Tests
// ═══════════════════════════════════════════════════════════════════════════════

interface Spec {
  id: string
  taskId: string
  type: string
  title: string
  content: string
  bibleRefs: string[]
  status: "draft" | "approved"
  createdAt: string
  approvedBy: string | null
  approvedAt: string | null
}

function createSpec(specs: Spec[], taskId: string, type: string, title: string, content: string, bibleRefs: string[] = []): Spec {
  const id = `SPEC-${String(specs.length + 1).padStart(3, "0")}`
  const spec: Spec = {
    id,
    taskId,
    type,
    title,
    content,
    bibleRefs,
    status: "draft",
    createdAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
  }
  specs.push(spec)
  return spec
}

function approveSpec(specs: Spec[], specId: string, approvedBy: string): { success: boolean; error?: string } {
  const spec = specs.find((s) => s.id === specId)
  if (!spec) return { success: false, error: `Spec ${specId} not found` }
  spec.status = "approved"
  spec.approvedBy = approvedBy
  spec.approvedAt = new Date().toISOString()
  return { success: true }
}

describe("Spec Workflow", () => {
  let specs: Spec[]

  beforeEach(() => {
    specs = []
  })

  it("should create spec with sequential ID", () => {
    const spec1 = createSpec(specs, "TASK-001", "api", "Auth Endpoints", "JWT auth flow")
    const spec2 = createSpec(specs, "TASK-002", "schema", "Poll Schema", "Polls table design")
    expect(spec1.id).toBe("SPEC-001")
    expect(spec2.id).toBe("SPEC-002")
    expect(spec1.status).toBe("draft")
  })

  it("should create spec with bible refs", () => {
    const spec = createSpec(specs, "TASK-001", "api", "Auth", "Content", ["T-006", "P-001"])
    expect(spec.bibleRefs).toHaveLength(2)
    expect(spec.bibleRefs[0]).toBe("T-006")
  })

  it("should approve spec", () => {
    createSpec(specs, "TASK-001", "api", "Auth", "Content")
    const result = approveSpec(specs, "SPEC-001", "architect")
    expect(result.success).toBe(true)
    expect(specs[0].status).toBe("approved")
    expect(specs[0].approvedBy).toBe("architect")
    expect(specs[0].approvedAt).not.toBeNull()
  })

  it("should reject approval for nonexistent spec", () => {
    const result = approveSpec(specs, "SPEC-999", "lead")
    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Constants Validation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Constants Integrity", () => {
  it("should have all 8 valid phases", () => {
    expect(PHASE_ORDER).toHaveLength(8)
    expect(PHASE_ORDER).toContain("DISCOVERY")
    expect(PHASE_ORDER).toContain("DEPLOYMENT")
  })

  it("should have all 8 roles", () => {
    const roles = ["lead", "architect", "designer", "backend", "frontend", "data", "qa", "devops"]
    for (const role of roles) {
      expect(Object.keys(PHASE_ACTIVE_ROLES).some((phase) => {
        const pr = PHASE_ACTIVE_ROLES[phase]
        return pr.primary.includes(role) || pr.support.includes(role)
      })).toBe(true)
    }
  })

  it("should have every role active in at least one phase", () => {
    const roles = ["lead", "architect", "designer", "backend", "frontend", "data", "qa", "devops"]
    for (const role of roles) {
      const activeInAnyPhase = PHASE_ORDER.some((phase) => isRoleActive(phase, role))
      expect(activeInAnyPhase).toBe(true)
    }
  })

  it("should have matching transition phases", () => {
    const transitions: Record<string, { from: string; to: string }> = {
      DISCOVERY_to_ARCHITECTURE: { from: "DISCOVERY", to: "ARCHITECTURE" },
      ARCHITECTURE_to_DESIGN: { from: "ARCHITECTURE", to: "DESIGN" },
      DESIGN_to_PLANNING: { from: "DESIGN", to: "PLANNING" },
      PLANNING_to_BACKEND: { from: "PLANNING", to: "BACKEND" },
      BACKEND_to_FRONTEND: { from: "BACKEND", to: "FRONTEND" },
      FRONTEND_to_QA: { from: "FRONTEND", to: "QA" },
      QA_to_DEPLOYMENT: { from: "QA", to: "DEPLOYMENT" },
    }
    for (const [key, val] of Object.entries(transitions)) {
      expect(PHASE_ORDER).toContain(val.from)
      expect(PHASE_ORDER).toContain(val.to)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Activity Log Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Activity Logging", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
  })

  it("should add activity log entry", () => {
    state.activityLog.push({
      timestamp: new Date().toISOString(),
      agent: "backend",
      action: "task_completed",
      details: "Implemented auth service",
    })
    expect(state.activityLog).toHaveLength(1)
    expect(state.activityLog[0].agent).toBe("backend")
  })

  it("should maintain chronological order", () => {
    const t1 = new Date("2026-01-01").toISOString()
    const t2 = new Date("2026-01-02").toISOString()
    state.activityLog.push(
      { timestamp: t1, agent: "backend", action: "start", details: "" },
      { timestamp: t2, agent: "backend", action: "finish", details: "" },
    )
    expect(new Date(state.activityLog[0].timestamp).getTime())
      .toBeLessThan(new Date(state.activityLog[1].timestamp).getTime())
  })

  it("should support filtering by agent", () => {
    state.activityLog.push(
      { timestamp: new Date().toISOString(), agent: "backend", action: "task_completed", details: "" },
      { timestamp: new Date().toISOString(), agent: "frontend", action: "task_completed", details: "" },
      { timestamp: new Date().toISOString(), agent: "backend", action: "task_started", details: "" },
    )
    const backendLogs = state.activityLog.filter((l) => l.agent === "backend")
    expect(backendLogs).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Chaos / Resilience Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Chaos Tests - State Corruption", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  it("should handle corrupted JSON gracefully", () => {
    writeFileSync(STATE_FILE, "invalid json{{{")

    let result: State | null = null
    try {
      const data = readFileSync(STATE_FILE, "utf-8")
      result = JSON.parse(data)
    } catch {
      result = createEmptyState()
    }

    expect(result).not.toBeNull()
    expect(result!.project.phase).toBe("BACKEND")
  })

  it("should handle empty file gracefully", () => {
    writeFileSync(STATE_FILE, "")

    let result: State | null = null
    try {
      const data = readFileSync(STATE_FILE, "utf-8")
      if (!data.trim()) throw new Error("Empty file")
      result = JSON.parse(data)
    } catch {
      result = createEmptyState()
    }

    expect(result).not.toBeNull()
    expect(result!.tasks).toHaveLength(0)
  })

  it("should handle partial JSON gracefully", () => {
    writeFileSync(STATE_FILE, '{"project": {"name": "Test"')

    let result: State | null = null
    try {
      const data = readFileSync(STATE_FILE, "utf-8")
      result = JSON.parse(data)
    } catch {
      result = createEmptyState()
    }

    expect(result).not.toBeNull()
  })

  it("should handle missing required fields", () => {
    writeFileSync(STATE_FILE, '{"project": {}}')

    let result: State | null = null
    try {
      const data = readFileSync(STATE_FILE, "utf-8")
      const parsed = JSON.parse(data)
      if (!parsed.project?.name || !parsed.tasks) {
        throw new Error("Invalid structure")
      }
      result = parsed
    } catch {
      result = createEmptyState()
    }

    expect(result!.project.name).toBe("TestProject")
  })
})

describe("Chaos Tests - Concurrent Operations", () => {
  let state: State

  beforeEach(() => {
    state = createEmptyState()
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  it("should handle rapid sequential saves", () => {
    for (let i = 0; i < 50; i++) {
      state.project.name = `Project_${i}`
      saveState(state)
    }

    const loaded = loadState()
    expect(loaded.project.name).toBe("Project_49")
  })

  it("should handle rapid task creation", () => {
    for (let i = 0; i < 100; i++) {
      createTask(state, `Task ${i}`)
    }

    expect(state.tasks).toHaveLength(100)
    expect(state.tasks[0].id).toBe("TASK-001")
    expect(state.tasks[99].id).toBe("TASK-100")
  })

  it("should handle concurrent lock attempts", () => {
    createTask(state, "Contested Task")

    const results = [
      claimTask(state, "TASK-001", "backend"),
      claimTask(state, "TASK-001", "frontend"),
      claimTask(state, "TASK-001", "data"),
    ]

    const successes = results.filter((r) => r.success)
    expect(successes).toHaveLength(1)

    const failures = results.filter((r) => !r.success)
    expect(failures).toHaveLength(2)
  })
})

describe("Chaos Tests - State Validation", () => {
  it("should validate correct state structure", () => {
    const validState = {
      name: "Test",
      code: "TST",
      phase: "BACKEND",
      enabledFeatures: [],
      tasks: [],
      taskLocks: {},
      decisions: [],
      activityLog: [],
      errorLog: [],
      agents: {},
    }

    const isValid = (
      typeof validState.name === "string" &&
      typeof validState.code === "string" &&
      typeof validState.phase === "string" &&
      Array.isArray(validState.tasks) &&
      typeof validState.taskLocks === "object"
    )

    expect(isValid).toBe(true)
  })

  it("should reject state with wrong types", () => {
    const invalidState = {
      name: 123,
      code: null,
      phase: "BACKEND",
      enabledFeatures: "not-an-array",
      tasks: {},
      taskLocks: [],
      decisions: [],
      activityLog: [],
      errorLog: [],
      agents: {},
    }

    const isValid = (
      typeof invalidState.name === "string" &&
      typeof invalidState.code === "string" &&
      Array.isArray(invalidState.tasks) &&
      typeof invalidState.taskLocks === "object" &&
      !Array.isArray(invalidState.taskLocks)
    )

    expect(isValid).toBe(false)
  })

  it("should handle null/undefined fields", () => {
    const stateWithNulls = {
      name: "",
      code: "",
      phase: "DISCOVERY",
      enabledFeatures: [],
      tasks: null,
      taskLocks: {},
      decisions: [],
      activityLog: [],
      errorLog: [],
      agents: {},
    }

    const tasks = stateWithNulls.tasks ?? []
    expect(tasks).toHaveLength(0)
  })
})

describe("Chaos Tests - Backup & Recovery", () => {
  const BACKUP_DIR = join(TEST_DIR, "backups")

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
    mkdirSync(BACKUP_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  it("should create backup file", () => {
    const state = createEmptyState()
    state.project.name = "BackupTest"
    saveState(state)

    const backupFile = join(BACKUP_DIR, "state-backup.json")
    writeFileSync(backupFile, readFileSync(STATE_FILE, "utf-8"))

    expect(existsSync(backupFile)).toBe(true)
  })

  it("should recover from backup when primary corrupted", () => {
    const state = createEmptyState()
    state.project.name = "Original"
    const backupFile = join(BACKUP_DIR, "state-backup.json")
    writeFileSync(backupFile, JSON.stringify(state, null, 2))

    writeFileSync(STATE_FILE, "corrupted{{{")

    let recovered: State
    try {
      recovered = JSON.parse(readFileSync(STATE_FILE, "utf-8"))
    } catch {
      if (existsSync(backupFile)) {
        recovered = JSON.parse(readFileSync(backupFile, "utf-8"))
      } else {
        recovered = createEmptyState()
      }
    }

    expect(recovered.project.name).toBe("Original")
  })

  it("should fallback to defaults when no backup available", () => {
    writeFileSync(STATE_FILE, "corrupted{{{")

    const backupFile = join(BACKUP_DIR, "state-backup.json")
    let recovered: State
    try {
      recovered = JSON.parse(readFileSync(STATE_FILE, "utf-8"))
    } catch {
      if (existsSync(backupFile)) {
        recovered = JSON.parse(readFileSync(backupFile, "utf-8"))
      } else {
        recovered = createEmptyState()
      }
    }

    expect(recovered.project.name).toBe("TestProject")
    expect(recovered.project.phase).toBe("BACKEND")
  })
})

describe("Chaos Tests - Retry Logic", () => {
  it("should retry failed operation", () => {
    let attempts = 0
    const maxRetries = 3

    function failingOperation(): boolean {
      attempts++
      if (attempts < 3) throw new Error("Transient failure")
      return true
    }

    let result = false
    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = failingOperation()
        break
      } catch (e) {
        lastError = e as Error
      }
    }

    expect(result).toBe(true)
    expect(attempts).toBe(3)
  })

  it("should give up after max retries", () => {
    let attempts = 0
    const maxRetries = 3

    function alwaysFailingOperation(): boolean {
      attempts++
      throw new Error("Permanent failure")
    }

    let result = false
    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = alwaysFailingOperation()
        break
      } catch (e) {
        lastError = e as Error
      }
    }

    expect(result).toBe(false)
    expect(attempts).toBe(3)
    expect(lastError?.message).toBe("Permanent failure")
  })

  it("should succeed on first try without retry", () => {
    let attempts = 0

    function successfulOperation(): boolean {
      attempts++
      return true
    }

    const result = successfulOperation()
    expect(result).toBe(true)
    expect(attempts).toBe(1)
  })
})
