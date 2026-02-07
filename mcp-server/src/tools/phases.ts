// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Phase Management Tools
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync } from "fs"
import { join } from "path"
import type { ToolHandler, ToolDefinition } from "../types.js"
import { PHASE_ORDER, PHASE_ACTIVE_ROLES, PHASE_TRANSITIONS } from "../constants.js"
import { getProjectRoot, getState, loadState, saveState } from "../state.js"
import { runPhaseValidation } from "../validation.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  get_phase_info: () => {
    loadState()
    const state = getState()
    const currentPhase = state.phase
    const currentOrder = PHASE_ORDER[currentPhase] || 0
    const activeRoles = PHASE_ACTIVE_ROLES[currentPhase] || { primary: "lead", support: [] }

    const nextPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder + 1)?.[0] || null
    const prevPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder - 1)?.[0] || null

    return {
      current: currentPhase,
      order: currentOrder,
      totalPhases: Object.keys(PHASE_ORDER).length,
      activeRoles,
      nextPhase,
      prevPhase,
      allPhases: Object.keys(PHASE_ORDER),
    }
  },

  validate_phase_transition: ({ fromPhase, toPhase }) => {
    loadState()
    const transitionKey = `${fromPhase}_to_${toPhase}`
    const transition = PHASE_TRANSITIONS[transitionKey]

    if (!transition) {
      return {
        valid: false,
        error: `Invalid transition from ${fromPhase} to ${toPhase}`,
        allowedTransitions: Object.keys(PHASE_TRANSITIONS).filter((k) => k.startsWith(fromPhase as string)),
      }
    }

    const validationResults: { check: string; passed: boolean; message: string }[] = []

    for (const check of transition.checks) {
      const result = runPhaseValidation(check)
      validationResults.push(result)
    }

    const allPassed = validationResults.every((r) => r.passed)

    return {
      valid: allPassed,
      transition: transitionKey,
      checks: validationResults,
      blockedBy: validationResults.filter((r) => !r.passed).map((r) => r.check),
    }
  },

  advance_phase: ({ force = false }) => {
    loadState()
    const state = getState()
    const currentPhase = state.phase
    const currentOrder = PHASE_ORDER[currentPhase] || 0
    const nextPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder + 1)?.[0]

    if (!nextPhase) {
      return { success: false, error: "Already at final phase (DEPLOYMENT)" }
    }

    if (!force) {
      const validation = handlers.validate_phase_transition({
        fromPhase: currentPhase,
        toPhase: nextPhase,
      }) as { valid: boolean; blockedBy?: string[] }

      if (!validation.valid) {
        return {
          success: false,
          error: "Phase transition blocked",
          blockedBy: validation.blockedBy,
          hint: "Use force=true to override (lead only)",
        }
      }
    }

    state.phase = nextPhase
    state.activityLog.push({
      timestamp: new Date().toISOString(),
      agent: "system",
      action: "phase_advanced",
      details: `${currentPhase} → ${nextPhase}${force ? " (forced)" : ""}`,
    })
    saveState()

    return {
      success: true,
      previousPhase: currentPhase,
      currentPhase: nextPhase,
      activeRoles: PHASE_ACTIVE_ROLES[nextPhase],
    }
  },

  rollback_phase: ({ targetPhase, reason }) => {
    loadState()
    const state = getState()
    const currentOrder = PHASE_ORDER[state.phase] || 0
    const targetOrder = PHASE_ORDER[targetPhase as string] || 0

    if (targetOrder >= currentOrder) {
      return { success: false, error: "Can only rollback to earlier phases" }
    }

    const previousPhase = state.phase
    state.phase = targetPhase as string
    state.activityLog.push({
      timestamp: new Date().toISOString(),
      agent: "lead",
      action: "phase_rollback",
      details: `${previousPhase} → ${targetPhase}: ${reason}`,
    })
    saveState()

    return {
      success: true,
      previousPhase,
      currentPhase: targetPhase,
      warning: "API contracts may need to be re-locked after changes",
    }
  },

  get_phase_deliverables: ({ phase }) => {
    const phaseDeliverables: Record<string, { required: string[]; optional: string[] }> = {
      DISCOVERY: {
        required: ["nyoworks.config.yaml", "docs/bible/product/"],
        optional: [],
      },
      ARCHITECTURE: {
        required: ["docs/bible/users/", "docs/bible/data/", "docs/bible/api/", "docs/bible/infra/", "packages/database/src/db/schema/"],
        optional: ["docs/bible/infra/security.md"],
      },
      DESIGN: {
        required: ["docs/bible/ui/", "packages/ui/src/components/", "packages/assets/"],
        optional: [],
      },
      PLANNING: {
        required: ["docs/bible/features/", ".nyoworks/state.json"],
        optional: [],
      },
      BACKEND: {
        required: ["apps/server/src/routes/", "apps/server/src/services/", "packages/api/src/routers/"],
        optional: ["apps/server/src/**/*.test.ts"],
      },
      FRONTEND: {
        required: ["apps/web/src/app/", "apps/web/src/components/"],
        optional: ["apps/web/messages/", "apps/mobile/", "apps/desktop/"],
      },
      QA: {
        required: ["tests/e2e/", "docs/bible/quality/"],
        optional: ["docs/bible/_tracking/test-plan.md"],
      },
      DEPLOYMENT: {
        required: ["docker/Dockerfile", ".github/workflows/"],
        optional: ["infra/"],
      },
    }

    return phaseDeliverables[phase as string] || { required: [], optional: [] }
  },

  check_phase_completion: ({ phase }) => {
    const deliverables = handlers.get_phase_deliverables({ phase }) as { required: string[]; optional: string[] }
    const results: { path: string; exists: boolean; required: boolean }[] = []

    for (const path of deliverables.required) {
      const fullPath = join(getProjectRoot(), path)
      results.push({ path, exists: existsSync(fullPath), required: true })
    }

    for (const path of deliverables.optional) {
      const fullPath = join(getProjectRoot(), path)
      results.push({ path, exists: existsSync(fullPath), required: false })
    }

    const requiredComplete = results.filter((r) => r.required).every((r) => r.exists)
    const completionPercentage = Math.round(
      (results.filter((r) => r.exists).length / results.length) * 100
    )

    return {
      phase,
      complete: requiredComplete,
      completionPercentage,
      deliverables: results,
      missing: results.filter((r) => r.required && !r.exists).map((r) => r.path),
    }
  },

  get_active_roles_for_phase: ({ phase }) => {
    const roles = PHASE_ACTIVE_ROLES[phase as string]
    if (!roles) {
      return { error: `Unknown phase: ${phase}` }
    }
    return {
      phase,
      primary: roles.primary,
      support: roles.support,
      allActive: [roles.primary, ...roles.support],
    }
  },

  is_role_active: ({ role, phase }) => {
    loadState()
    const state = getState()
    const targetPhase = (phase as string) || state.phase
    const roles = PHASE_ACTIVE_ROLES[targetPhase]

    if (!roles) {
      return { error: `Unknown phase: ${targetPhase}` }
    }

    const isActive = role === roles.primary || roles.support.includes(role as string)
    const isPrimary = role === roles.primary

    return {
      role,
      phase: targetPhase,
      isActive,
      isPrimary,
      isSupport: isActive && !isPrimary,
    }
  },

  get_workflow_status: () => {
    loadState()
    const state = getState()
    const phaseStatuses: {
      phase: string
      order: number
      status: "completed" | "current" | "pending"
      activeRoles: { primary: string; support: string[] }
    }[] = []

    const currentOrder = PHASE_ORDER[state.phase] || 0

    for (const [phase, order] of Object.entries(PHASE_ORDER)) {
      let status: "completed" | "current" | "pending"
      if (order < currentOrder) {
        status = "completed"
      } else if (order === currentOrder) {
        status = "current"
      } else {
        status = "pending"
      }

      phaseStatuses.push({
        phase,
        order,
        status,
        activeRoles: PHASE_ACTIVE_ROLES[phase],
      })
    }

    return {
      currentPhase: state.phase,
      phases: phaseStatuses,
      progress: `${currentOrder}/${Object.keys(PHASE_ORDER).length}`,
      progressPercentage: Math.round((currentOrder / Object.keys(PHASE_ORDER).length) * 100),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "get_phase_info",
    description: "Get detailed information about current phase including active roles and transitions",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "validate_phase_transition",
    description: "Validate if a phase transition is allowed and check all requirements",
    inputSchema: {
      type: "object" as const,
      properties: {
        fromPhase: { type: "string", description: "Current phase" },
        toPhase: { type: "string", description: "Target phase" },
      },
      required: ["fromPhase", "toPhase"],
    },
  },
  {
    name: "advance_phase",
    description: "Advance to the next workflow phase (validates requirements unless forced)",
    inputSchema: {
      type: "object" as const,
      properties: {
        force: { type: "boolean", description: "Skip validation (lead only)" },
      },
    },
  },
  {
    name: "rollback_phase",
    description: "Rollback to an earlier phase (lead only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        targetPhase: { type: "string", description: "Phase to rollback to" },
        reason: { type: "string", description: "Reason for rollback" },
      },
      required: ["targetPhase", "reason"],
    },
  },
  {
    name: "get_phase_deliverables",
    description: "Get required and optional deliverables for a phase",
    inputSchema: {
      type: "object" as const,
      properties: {
        phase: { type: "string" },
      },
      required: ["phase"],
    },
  },
  {
    name: "check_phase_completion",
    description: "Check if a phase is complete by verifying all deliverables",
    inputSchema: {
      type: "object" as const,
      properties: {
        phase: { type: "string" },
      },
      required: ["phase"],
    },
  },
  {
    name: "get_active_roles_for_phase",
    description: "Get which roles are active (primary and support) for a phase",
    inputSchema: {
      type: "object" as const,
      properties: {
        phase: { type: "string" },
      },
      required: ["phase"],
    },
  },
  {
    name: "is_role_active",
    description: "Check if a specific role is active in a phase",
    inputSchema: {
      type: "object" as const,
      properties: {
        role: { type: "string" },
        phase: { type: "string", description: "Optional, defaults to current phase" },
      },
      required: ["role"],
    },
  },
  {
    name: "get_workflow_status",
    description: "Get complete workflow status with all phases and progress",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
