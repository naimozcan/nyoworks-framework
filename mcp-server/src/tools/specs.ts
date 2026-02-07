// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Spec Registry Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, Spec } from "../types.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  create_spec: ({ taskId, type, title, content, bibleRefs }) => {
    loadState()
    const state = getState()

    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) return { error: `Task ${taskId} not found` }

    if (!state.specs) state.specs = []
    const existing = state.specs.find((s) => s.taskId === taskId)
    if (existing) return { error: `Spec already exists for ${taskId}: ${existing.id}. Use update instead.` }

    const lineCount = (content as string).split("\n").length
    let warning: string | null = null
    if (lineCount > 30) {
      warning = `WARNING: Spec is ${lineCount} lines. Best practice: 10-20 lines. Over-specified specs reduce AI code quality.`
    }

    const specId = `SPEC-${String(state.specs.length + 1).padStart(3, "0")}`

    const spec: Spec = {
      id: specId,
      taskId: taskId as string,
      type: type as Spec["type"],
      title: title as string,
      content: content as string,
      bibleRefs: (bibleRefs as string[]) || [],
      createdBy: "agent",
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      status: "draft",
      rejectionReason: null,
    }

    state.specs.push(spec)
    saveState()

    return { specId, taskId, status: "draft", lineCount, warning, message: "Spec created. Needs approval from lead or architect before implementation." }
  },

  get_spec: ({ taskId }) => {
    loadState()
    const state = getState()

    if (!state.specs) state.specs = []
    const spec = state.specs.find((s) => s.taskId === taskId)

    if (!spec) {
      return {
        found: false,
        taskId,
        message: state.specRequired
          ? "NO SPEC FOUND. Spec is REQUIRED before implementation. Create one with create_spec."
          : "No spec found. Consider creating one for better implementation quality.",
      }
    }

    return {
      found: true,
      spec: {
        id: spec.id,
        type: spec.type,
        title: spec.title,
        content: spec.content,
        bibleRefs: spec.bibleRefs,
        status: spec.status,
        approvedBy: spec.approvedBy,
      },
    }
  },

  approve_spec: ({ specId, approvedBy }) => {
    loadState()
    const state = getState()

    if (!state.specs) return { error: "No specs exist" }
    const spec = state.specs.find((s) => s.id === specId)
    if (!spec) return { error: `Spec ${specId} not found` }
    if (spec.status === "approved") return { error: `Spec ${specId} already approved` }

    spec.status = "approved"
    spec.approvedBy = approvedBy as string
    spec.approvedAt = new Date().toISOString()
    saveState()

    return { success: true, specId, taskId: spec.taskId, approvedBy, message: `Spec ${specId} approved by ${approvedBy} for task ${spec.taskId}` }
  },

  require_spec: ({ enabled }) => {
    loadState()
    const state = getState()

    state.specRequired = enabled as boolean
    saveState()

    return {
      success: true,
      specRequired: state.specRequired,
      message: state.specRequired
        ? "Spec requirement ENABLED. All tasks need approved specs before implementation."
        : "Spec requirement DISABLED. Tasks can proceed without specs.",
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "create_spec",
    description: "Create a specification for a task. Specs follow the 'minimum viable spec' principle - short (10-20 lines), focused on removing ambiguity, NOT on dictating implementation details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Task ID to create spec for" },
        type: { type: "string", enum: ["api", "page", "component", "service", "schema", "test"], description: "Spec type" },
        title: { type: "string", description: "Spec title" },
        content: { type: "string", description: "Markdown spec content (10-20 lines recommended)" },
        bibleRefs: { type: "array", items: { type: "string" }, description: "Bible decision references" },
      },
      required: ["taskId", "type", "title", "content"],
    },
  },
  {
    name: "get_spec",
    description: "Get the specification for a task. Returns spec content and approval status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Task ID to get spec for" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "approve_spec",
    description: "Approve a specification. Lead or architect only. Required before implementation when specRequired is enabled.",
    inputSchema: {
      type: "object" as const,
      properties: {
        specId: { type: "string", description: "Spec ID to approve" },
        approvedBy: { type: "string", description: "Role approving (lead or architect)" },
      },
      required: ["specId", "approvedBy"],
    },
  },
  {
    name: "require_spec",
    description: "Toggle spec requirement. When enabled, all tasks need approved specs before implementation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        enabled: { type: "boolean", description: "Enable or disable spec requirement" },
      },
      required: ["enabled"],
    },
  },
]

export { handlers, definitions }
