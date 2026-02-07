// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Handoff Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, AgentHandoff } from "../types.js"
import { VALID_ROLES } from "../constants.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  create_handoff: ({ fromAgent, toAgent, taskId, summary, artifacts, apiContracts, decisions, warnings, context }) => {
    loadState()
    const state = getState()

    if (!VALID_ROLES.includes(fromAgent as string) && fromAgent !== "user") {
      return { error: `Invalid fromAgent: ${fromAgent}. Valid: ${VALID_ROLES.join(", ")}, user` }
    }
    if (toAgent !== "*" && !VALID_ROLES.includes(toAgent as string) && toAgent !== "user") {
      return { error: `Invalid toAgent: ${toAgent}. Valid: ${VALID_ROLES.join(", ")}, *, user` }
    }

    if (!state.handoffs) state.handoffs = []

    const handoffId = `HO-${String(state.handoffs.length + 1).padStart(3, "0")}`

    const handoff: AgentHandoff = {
      id: handoffId,
      fromAgent: fromAgent as string,
      toAgent: toAgent as string,
      phaseTransition: null,
      taskId: (taskId as string) || null,
      summary: summary as string,
      artifacts: (artifacts as string[]) || [],
      apiContracts: (apiContracts as string[]) || [],
      decisions: (decisions as string[]) || [],
      warnings: (warnings as string[]) || [],
      context: (context as Record<string, unknown>) || {},
      status: "pending",
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
    }

    state.handoffs.push(handoff)
    saveState()

    return {
      handoffId,
      status: "created",
      fromAgent,
      toAgent,
      summary,
      artifactCount: handoff.artifacts.length,
      decisionCount: handoff.decisions.length,
      warningCount: handoff.warnings.length,
    }
  },

  get_pending_handoffs: ({ agentRole }) => {
    loadState()
    const state = getState()

    if (!state.handoffs) state.handoffs = []

    const pending = state.handoffs.filter(
      (h) => h.status === "pending" && (h.toAgent === agentRole || h.toAgent === "*")
    )

    if (pending.length === 0) {
      return { count: 0, message: "No pending handoffs. You can proceed normally.", handoffs: [] }
    }

    return {
      count: pending.length,
      message: `${pending.length} handoff(s) waiting. ACKNOWLEDGE each before starting work.`,
      handoffs: pending.map((h) => ({
        id: h.id,
        fromAgent: h.fromAgent,
        summary: h.summary,
        artifacts: h.artifacts,
        apiContracts: h.apiContracts,
        decisions: h.decisions,
        warnings: h.warnings,
        context: h.context,
        createdAt: h.createdAt,
      })),
    }
  },

  acknowledge_handoff: ({ handoffId, agentRole }) => {
    loadState()
    const state = getState()

    if (!state.handoffs) return { error: "No handoffs exist" }

    const handoff = state.handoffs.find((h) => h.id === handoffId)
    if (!handoff) return { error: `Handoff ${handoffId} not found` }
    if (handoff.status === "acknowledged") {
      return { error: `Handoff ${handoffId} already acknowledged by ${handoff.acknowledgedBy}` }
    }
    if (handoff.toAgent !== agentRole && handoff.toAgent !== "*") {
      return { error: `Handoff ${handoffId} is for ${handoff.toAgent}, not ${agentRole}` }
    }

    handoff.status = "acknowledged"
    handoff.acknowledgedAt = new Date().toISOString()
    handoff.acknowledgedBy = agentRole as string
    saveState()

    return {
      status: "acknowledged",
      handoffId,
      fromAgent: handoff.fromAgent,
      summary: handoff.summary,
      message: "Context received. You can now proceed with your work.",
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "create_handoff",
    description: "Create a context handoff from one agent to another. MUST be called when completing work that another agent will consume. Preserves context across agent sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fromAgent: { type: "string", description: "Sending agent role" },
        toAgent: { type: "string", description: "Target agent role (or '*' for all)" },
        taskId: { type: "string", description: "Related task ID (optional)" },
        summary: { type: "string", description: "What was done (1-3 sentences)" },
        artifacts: { type: "array", items: { type: "string" }, description: "Files/directories created or modified" },
        apiContracts: { type: "array", items: { type: "string" }, description: "API endpoints relevant to next agent" },
        decisions: { type: "array", items: { type: "string" }, description: "Decision IDs referenced (P-xxx, T-xxx)" },
        warnings: { type: "array", items: { type: "string" }, description: "Known issues, incomplete items, gotchas" },
        context: { type: "object", description: "Additional context (free-form)" },
      },
      required: ["fromAgent", "toAgent", "summary"],
    },
  },
  {
    name: "get_pending_handoffs",
    description: "Get unacknowledged handoffs for an agent. MUST be called on every agent invocation to check for context from previous agents.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentRole: { type: "string", description: "Agent role checking for handoffs" },
      },
      required: ["agentRole"],
    },
  },
  {
    name: "acknowledge_handoff",
    description: "Acknowledge receipt of a handoff. Agent confirms they have read and understood the context.",
    inputSchema: {
      type: "object" as const,
      properties: {
        handoffId: { type: "string", description: "Handoff ID to acknowledge" },
        agentRole: { type: "string", description: "Agent acknowledging the handoff" },
      },
      required: ["handoffId", "agentRole"],
    },
  },
]

export { handlers, definitions }
