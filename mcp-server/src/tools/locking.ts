// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Task Locking Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, TaskLock } from "../types.js"
import { TASK_LOCK_TIMEOUT_MINUTES, PHASE_ACTIVE_ROLES } from "../constants.js"
import { getState, loadState, saveState, cleanupExpiredLocks } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  claim_task: ({ taskId, agentRole }) => {
    loadState()
    cleanupExpiredLocks()
    const state = getState()

    if (state.taskLocks[taskId as string]) {
      const existing = state.taskLocks[taskId as string]
      return {
        success: false,
        error: `Task already claimed by ${existing.agentRole}`,
        lock: existing,
      }
    }

    const now = new Date()
    const expires = new Date(now.getTime() + TASK_LOCK_TIMEOUT_MINUTES * 60 * 1000)
    const lock: TaskLock = {
      taskId: taskId as string,
      agentRole: agentRole as string,
      claimedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      lastHeartbeat: now.toISOString(),
    }
    state.taskLocks[taskId as string] = lock
    saveState()
    return { success: true, lock }
  },

  release_task: ({ taskId, agentRole }) => {
    loadState()
    const state = getState()
    const lock = state.taskLocks[taskId as string]
    if (!lock) {
      return { success: false, error: "Task is not locked" }
    }
    if (lock.agentRole !== agentRole) {
      return { success: false, error: `Task is locked by ${lock.agentRole}, not ${agentRole}` }
    }
    delete state.taskLocks[taskId as string]
    saveState()
    return { success: true, message: `Task ${taskId} released` }
  },

  get_task_lock: ({ taskId }) => {
    loadState()
    cleanupExpiredLocks()
    const state = getState()
    const lock = state.taskLocks[taskId as string]
    if (lock) {
      return { locked: true, lock }
    }
    return { locked: false }
  },

  get_all_locks: () => {
    loadState()
    cleanupExpiredLocks()
    const state = getState()
    return { locks: state.taskLocks, count: Object.keys(state.taskLocks).length }
  },

  validate_work_authorization: ({ agentRole, action }) => {
    loadState()
    cleanupExpiredLocks()
    const state = getState()

    const validActions = ["implement", "design", "test", "deploy", "review", "document"]
    if (!validActions.includes(action as string)) {
      return {
        authorized: false,
        error: `Invalid action: ${action}. Must be one of: ${validActions.join(", ")}`,
      }
    }

    const agentLocks = Object.values(state.taskLocks).filter((lock) => lock.agentRole === agentRole)
    if (agentLocks.length === 0) {
      return {
        authorized: false,
        error: "NO ACTIVE TASK CLAIMED",
        instruction: "You MUST claim a task before doing any work. Use get_tasks() to see available tasks, then claim_task() to lock one.",
        availableTasks: state.tasks.filter((t) => t.status === "pending").map((t) => ({ id: t.id, title: t.title })),
      }
    }

    const claimedTaskIds = agentLocks.map((lock) => lock.taskId)
    const claimedTasks = state.tasks.filter((t) => claimedTaskIds.includes(t.id))

    const activeRoles = PHASE_ACTIVE_ROLES[state.phase]
    const isRoleActive = activeRoles && (activeRoles.primary === agentRole || activeRoles.support.includes(agentRole as string))

    if (!isRoleActive) {
      return {
        authorized: false,
        error: `Role ${agentRole} is NOT active in ${state.phase} phase`,
        activeRoles: activeRoles ? [activeRoles.primary, ...activeRoles.support] : [],
        instruction: "Wait for the appropriate phase or ask /lead to advance the phase.",
      }
    }

    if (state.specRequired) {
      for (const taskId of claimedTaskIds) {
        const spec = state.specs?.find((s) => s.taskId === taskId)
        if (!spec || spec.status !== "approved") {
          return {
            authorized: false,
            error: "SPEC_REQUIRED",
            taskId,
            message: `Task ${taskId} requires an approved spec before implementation. Create spec with create_spec, then get it approved.`,
            specExists: !!spec,
            specStatus: spec?.status || "none",
          }
        }
      }
    }

    return {
      authorized: true,
      agent: agentRole,
      phase: state.phase,
      claimedTasks: claimedTasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      message: `Authorized to ${action}. You have ${claimedTasks.length} active task(s).`,
    }
  },

  force_unlock: ({ taskId }) => {
    loadState()
    const state = getState()
    if (state.taskLocks[taskId as string]) {
      delete state.taskLocks[taskId as string]
      saveState()
      return { success: true, message: `Task ${taskId} force unlocked` }
    }
    return { success: false, error: "Task is not locked" }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "claim_task",
    description: "Claim a task (lock it for an agent) to prevent conflicts",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string" },
        agentRole: { type: "string" },
      },
      required: ["taskId", "agentRole"],
    },
  },
  {
    name: "release_task",
    description: "Release a task lock",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string" },
        agentRole: { type: "string" },
      },
      required: ["taskId", "agentRole"],
    },
  },
  {
    name: "get_task_lock",
    description: "Check if a task is locked",
    inputSchema: {
      type: "object" as const,
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "get_all_locks",
    description: "Get all active task locks",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "validate_work_authorization",
    description: "MANDATORY: Check if agent is authorized to work. Must be called BEFORE any implementation. Returns error if no task is claimed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentRole: { type: "string", description: "The agent role requesting authorization" },
        action: { type: "string", description: "Action type: implement, design, test, deploy, review, document" },
      },
      required: ["agentRole", "action"],
    },
  },
  {
    name: "force_unlock",
    description: "Force unlock a task (lead only)",
    inputSchema: {
      type: "object" as const,
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
]

export { handlers, definitions }
