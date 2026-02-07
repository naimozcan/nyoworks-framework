// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Sub-Phase Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition } from "../types.js"
import { VALID_PHASES } from "../constants.js"
import { getState, loadState, saveState } from "../state.js"
import { runPhaseValidation } from "../validation.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  set_sub_phases: ({ phase, subPhases }) => {
    loadState()
    const state = getState()

    if (!VALID_PHASES.includes(phase as string)) {
      return { error: `Invalid phase: ${phase}. Valid: ${VALID_PHASES.join(", ")}` }
    }

    if (!state.subPhaseDefinitions) state.subPhaseDefinitions = {}

    const defs = (subPhases as Array<{ id: string; name: string; description?: string; primaryRole: string; supportRoles?: string[]; exitCriteria?: string[] }>).map((sp, i) => ({
      id: sp.id,
      name: sp.name,
      description: sp.description || "",
      order: i + 1,
      primaryRole: sp.primaryRole,
      supportRoles: sp.supportRoles || [],
      exitCriteria: sp.exitCriteria || [],
    }))

    state.subPhaseDefinitions[phase as string] = defs

    if (state.phase === phase) {
      state.currentSubPhase = defs[0].id
      if (!state.subPhaseHistory) state.subPhaseHistory = []
      state.subPhaseHistory.push({
        id: defs[0].id,
        status: "current",
        startedAt: new Date().toISOString(),
        completedAt: null,
      })
    }

    saveState()

    return {
      success: true,
      phase,
      subPhaseCount: defs.length,
      subPhases: defs.map((d) => d.id),
      message: `Sub-phases defined for ${phase}: ${defs.length} sub-phases`,
    }
  },

  get_sub_phase: () => {
    loadState()
    const state = getState()

    const phase = state.phase
    const defs = state.subPhaseDefinitions?.[phase]

    if (!defs || defs.length === 0) {
      return { phase, hasSubPhases: false, message: "No sub-phases defined for current phase. Phase operates as single unit." }
    }

    const current = state.currentSubPhase
    const currentDef = defs.find((d) => d.id === current)
    const currentIndex = defs.findIndex((d) => d.id === current)
    const completedCount = defs.filter((_d, i) => i < currentIndex).length
    const nextDef = currentIndex < defs.length - 1 ? defs[currentIndex + 1] : null

    return {
      phase,
      hasSubPhases: true,
      current: currentDef ? {
        id: current,
        name: currentDef.name,
        description: currentDef.description,
        primaryRole: currentDef.primaryRole,
        supportRoles: currentDef.supportRoles,
        exitCriteria: currentDef.exitCriteria,
      } : null,
      progress: `${completedCount}/${defs.length}`,
      next: nextDef ? { id: nextDef.id, name: nextDef.name } : null,
      allSubPhases: defs.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.id === current ? "current" : defs.indexOf(d) < currentIndex ? "completed" : "pending",
      })),
    }
  },

  advance_sub_phase: () => {
    loadState()
    const state = getState()

    const phase = state.phase
    const defs = state.subPhaseDefinitions?.[phase]
    if (!defs) return { error: "No sub-phases defined for current phase" }

    const currentIndex = defs.findIndex((d) => d.id === state.currentSubPhase)
    if (currentIndex === -1) return { error: "Current sub-phase not found" }

    const currentDef = defs[currentIndex]
    if (currentDef.exitCriteria && currentDef.exitCriteria.length > 0) {
      const failed = currentDef.exitCriteria
        .map((criteria) => runPhaseValidation(criteria))
        .filter((r) => !r.passed)
      if (failed.length > 0) {
        return { error: `Cannot advance. Failed criteria: ${failed.map((f) => f.message).join(", ")}` }
      }
    }

    if (currentIndex >= defs.length - 1) {
      return {
        status: "phase_complete",
        message: `All sub-phases of ${phase} completed. Use advance_phase to move to next phase.`,
        completedSubPhases: defs.map((d) => d.id),
      }
    }

    const historyEntry = state.subPhaseHistory?.find(
      (h) => h.id === state.currentSubPhase && h.status === "current"
    )
    if (historyEntry) {
      historyEntry.status = "completed"
      historyEntry.completedAt = new Date().toISOString()
    }

    const nextDef = defs[currentIndex + 1]
    state.currentSubPhase = nextDef.id

    if (!state.subPhaseHistory) state.subPhaseHistory = []
    state.subPhaseHistory.push({
      id: nextDef.id,
      status: "current",
      startedAt: new Date().toISOString(),
      completedAt: null,
    })

    saveState()

    return {
      success: true,
      from: defs[currentIndex].id,
      to: nextDef.id,
      progress: `${currentIndex + 2}/${defs.length}`,
      message: `Advanced to ${nextDef.id}: ${nextDef.name} (${currentIndex + 2}/${defs.length})`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "set_sub_phases",
    description: "Define sub-phases for a workflow phase. Lead only. Sub-phases allow granular tracking within a major phase.",
    inputSchema: {
      type: "object" as const,
      properties: {
        phase: { type: "string", description: "Parent phase (BACKEND, FRONTEND, QA)" },
        subPhases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              primaryRole: { type: "string" },
              supportRoles: { type: "array", items: { type: "string" } },
              exitCriteria: { type: "array", items: { type: "string" } },
            },
            required: ["id", "name", "primaryRole"],
          },
          description: "Ordered list of sub-phases",
        },
      },
      required: ["phase", "subPhases"],
    },
  },
  {
    name: "get_sub_phase",
    description: "Get current sub-phase info for the active workflow phase.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "advance_sub_phase",
    description: "Advance to the next sub-phase within the current workflow phase. Validates exit criteria.",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
