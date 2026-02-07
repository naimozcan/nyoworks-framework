// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Activity & Error Log Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, ActivityLog } from "../types.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  log_activity: ({ agent, action, details = "" }) => {
    const state = getState()
    const entry: ActivityLog = {
      timestamp: new Date().toISOString(),
      agent: agent as string,
      action: action as string,
      details: details as string,
    }
    state.activityLog.push(entry)
    saveState()
    return { success: true }
  },

  get_activity_log: ({ limit = 50 }) => {
    loadState()
    const state = getState()
    const logs = state.activityLog.slice(-(limit as number))
    return { logs, total: state.activityLog.length }
  },

  get_error_log: ({ limit = 20 }) => {
    loadState()
    const state = getState()
    const logs = state.errorLog?.slice(-(limit as number)) || []
    return { errors: logs, total: state.errorLog?.length || 0 }
  },

  clear_error_log: () => {
    loadState()
    const state = getState()
    state.errorLog = []
    saveState()
    return { success: true, message: "Error log cleared" }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "log_activity",
    description: "Log an agent activity for audit trail",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent: { type: "string" },
        action: { type: "string" },
        details: { type: "string" },
      },
      required: ["agent", "action"],
    },
  },
  {
    name: "get_activity_log",
    description: "Get recent activity logs",
    inputSchema: {
      type: "object" as const,
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "get_error_log",
    description: "Get recent error logs for debugging",
    inputSchema: {
      type: "object" as const,
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "clear_error_log",
    description: "Clear all error logs",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
