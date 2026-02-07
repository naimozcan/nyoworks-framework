// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Feature Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition } from "../types.js"
import { ALL_FEATURES } from "../constants.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  list_features: ({ enabledOnly = false }) => {
    loadState()
    const state = getState()
    if (enabledOnly) {
      return { features: state.enabledFeatures }
    }
    return {
      allFeatures: ALL_FEATURES,
      enabled: state.enabledFeatures,
      disabled: ALL_FEATURES.filter((f) => !state.enabledFeatures.includes(f)),
    }
  },

  enable_feature: ({ featureId }) => {
    loadState()
    const state = getState()
    if (!state.enabledFeatures.includes(featureId as string)) {
      state.enabledFeatures.push(featureId as string)
      saveState()
    }
    return { success: true, enabledFeatures: state.enabledFeatures }
  },

  disable_feature: ({ featureId }) => {
    loadState()
    const state = getState()
    state.enabledFeatures = state.enabledFeatures.filter((f) => f !== featureId)
    saveState()
    return { success: true, enabledFeatures: state.enabledFeatures }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "list_features",
    description: "List all available features",
    inputSchema: {
      type: "object" as const,
      properties: { enabledOnly: { type: "boolean" } },
    },
  },
  {
    name: "enable_feature",
    description: "Enable a feature",
    inputSchema: {
      type: "object" as const,
      properties: { featureId: { type: "string" } },
      required: ["featureId"],
    },
  },
  {
    name: "disable_feature",
    description: "Disable a feature",
    inputSchema: {
      type: "object" as const,
      properties: { featureId: { type: "string" } },
      required: ["featureId"],
    },
  },
]

export { handlers, definitions }
