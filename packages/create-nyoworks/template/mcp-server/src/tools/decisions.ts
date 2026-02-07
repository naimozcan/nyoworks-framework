// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Decision Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, Decision } from "../types.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  add_decision: ({ id, title, description, rationale }) => {
    const state = getState()
    const decision: Decision = {
      id: id as string,
      title: title as string,
      description: description as string,
      rationale: rationale as string,
      createdAt: new Date().toISOString(),
    }
    state.decisions.push(decision)
    saveState()
    return { success: true, decision }
  },

  get_decisions: () => {
    loadState()
    const state = getState()
    return { decisions: state.decisions }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "add_decision",
    description: "Add a project decision (P-xxx or T-xxx)",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["id", "title", "description", "rationale"],
    },
  },
  {
    name: "get_decisions",
    description: "Get all project decisions",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
