// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Tool Registry
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition } from "../types.js"

import { handlers as projectHandlers, definitions as projectDefinitions } from "./project.js"
import { handlers as taskHandlers, definitions as taskDefinitions } from "./tasks.js"
import { handlers as lockingHandlers, definitions as lockingDefinitions } from "./locking.js"
import { handlers as featureHandlers, definitions as featureDefinitions } from "./features.js"
import { handlers as bibleHandlers, definitions as bibleDefinitions } from "./bible.js"
import { handlers as decisionHandlers, definitions as decisionDefinitions } from "./decisions.js"
import { handlers as activityHandlers, definitions as activityDefinitions } from "./activity.js"
import { handlers as phaseHandlers, definitions as phaseDefinitions } from "./phases.js"
import { handlers as handoffHandlers, definitions as handoffDefinitions } from "./handoffs.js"
import { handlers as subphaseHandlers, definitions as subphaseDefinitions } from "./subphases.js"
import { handlers as specHandlers, definitions as specDefinitions } from "./specs.js"
import { handlers as visualHandlers, definitions as visualDefinitions } from "./visual.js"
import { handlers as cleanupHandlers, definitions as cleanupDefinitions } from "./cleanup.js"
import { handlers as healthHandlers, definitions as healthDefinitions } from "./health.js"
import { gitToolHandlers, gitToolDefinitions } from "./git.js"

// ─────────────────────────────────────────────────────────────────────────────
// Merged Handlers
// ─────────────────────────────────────────────────────────────────────────────

const toolHandlers: Record<string, ToolHandler> = {
  ...projectHandlers,
  ...taskHandlers,
  ...lockingHandlers,
  ...featureHandlers,
  ...bibleHandlers,
  ...decisionHandlers,
  ...activityHandlers,
  ...phaseHandlers,
  ...handoffHandlers,
  ...subphaseHandlers,
  ...specHandlers,
  ...visualHandlers,
  ...cleanupHandlers,
  ...healthHandlers,
  ...gitToolHandlers,
}

// ─────────────────────────────────────────────────────────────────────────────
// Merged Definitions
// ─────────────────────────────────────────────────────────────────────────────

const toolDefinitions: ToolDefinition[] = [
  ...projectDefinitions,
  ...taskDefinitions,
  ...lockingDefinitions,
  ...featureDefinitions,
  ...bibleDefinitions,
  ...decisionDefinitions,
  ...activityDefinitions,
  ...phaseDefinitions,
  ...handoffDefinitions,
  ...subphaseDefinitions,
  ...specDefinitions,
  ...visualDefinitions,
  ...cleanupDefinitions,
  ...healthDefinitions,
  ...gitToolDefinitions,
]

export { toolHandlers, toolDefinitions }
