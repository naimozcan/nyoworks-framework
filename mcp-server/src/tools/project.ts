// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Project Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition } from "../types.js"
import { VALID_PHASES, VALID_ROLES, TASK_LOCK_TIMEOUT_MINUTES } from "../constants.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  init_project: ({ name, code, features }) => {
    const state = getState()
    state.name = name as string
    state.code = code as string
    state.enabledFeatures = features as string[]
    state.phase = "DISCOVERY"
    saveState()
    return { success: true, message: `Project ${name} initialized with features: ${features}` }
  },

  get_status: () => {
    loadState()
    const state = getState()
    return {
      project: { name: state.name, code: state.code },
      phase: state.phase,
      enabledFeatures: state.enabledFeatures,
      taskCount: state.tasks.length,
      activeAgents: Object.keys(state.agents),
      activeLocks: Object.keys(state.taskLocks).length,
    }
  },

  set_phase: ({ phase }) => {
    const state = getState()
    if (!VALID_PHASES.includes(phase as string)) {
      return { success: false, error: `Invalid phase. Must be one of: ${VALID_PHASES.join(", ")}` }
    }
    state.phase = phase as string
    saveState()
    return { success: true, phase }
  },

  register_agent: ({ role }) => {
    const state = getState()
    if (!VALID_ROLES.includes(role as string)) {
      return { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }
    }
    const now = new Date().toISOString()
    state.agents[role as string] = { registeredAt: now, status: "active", lastSeen: now }
    saveState()
    return { success: true, role }
  },

  heartbeat: ({ agentRole, taskId = null }) => {
    loadState()
    const state = getState()
    const now = new Date().toISOString()

    if (state.agents[agentRole as string]) {
      state.agents[agentRole as string].lastSeen = now
    }

    if (taskId && state.taskLocks[taskId as string]) {
      const lock = state.taskLocks[taskId as string]
      if (lock.agentRole === agentRole) {
        lock.lastHeartbeat = now
        lock.expiresAt = new Date(Date.now() + TASK_LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString()
      }
    }

    saveState()
    return { success: true, timestamp: now }
  },

  get_project_summary: () => {
    loadState()
    const state = getState()
    return {
      name: state.name,
      code: state.code,
      phase: state.phase,
      features: state.enabledFeatures,
      pendingTasks: state.tasks.filter((t) => t.status === "pending").length,
      inProgressTasks: state.tasks.filter((t) => t.status === "in_progress").length,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "init_project",
    description: "Initialize a new project",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Project name" },
        code: { type: "string", description: "Project code (uppercase)" },
        features: { type: "array", items: { type: "string" }, description: "Enabled features" },
      },
      required: ["name", "code", "features"],
    },
  },
  {
    name: "get_status",
    description: "Get current project status",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "set_phase",
    description: "Set current workflow phase (DISCOVERY, ARCHITECTURE, PLANNING, BACKEND, FRONTEND, QA, DEPLOYMENT)",
    inputSchema: {
      type: "object" as const,
      properties: { phase: { type: "string" } },
      required: ["phase"],
    },
  },
  {
    name: "register_agent",
    description: "Register an agent role",
    inputSchema: {
      type: "object" as const,
      properties: { role: { type: "string" } },
      required: ["role"],
    },
  },
  {
    name: "heartbeat",
    description: "Send heartbeat to keep task lock alive and update agent status",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentRole: { type: "string", description: "Agent role sending heartbeat" },
        taskId: { type: "string", description: "Optional task ID to refresh lock" },
      },
      required: ["agentRole"],
    },
  },
  {
    name: "get_project_summary",
    description: "Get a concise project summary (token efficient)",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
