// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Bible Tools
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import type { ToolHandler, ToolDefinition } from "../types.js"
import { BIBLE_ROLE_MAPPING } from "../constants.js"
import { getProjectRoot, getState, loadState, saveState, parseDecisionsFromMarkdown } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  get_bible_sections_for_role: ({ role }) => {
    const sections = BIBLE_ROLE_MAPPING[role as string] || []
    return { role, sections }
  },

  get_bible_section: ({ section }) => {
    const biblePath = join(getProjectRoot(), "docs", "bible", section as string)
    if (!existsSync(biblePath)) {
      return { error: `Section ${section} not found` }
    }

    const content: Record<string, string> = {}
    const files = readdirSync(biblePath).filter((f) => f.endsWith(".md"))
    for (const file of files) {
      content[file] = readFileSync(join(biblePath, file), "utf-8")
    }
    return { section, files: content }
  },

  get_task_context: ({ taskId }) => {
    loadState()
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { error: "Task not found" }
    }
    const context: Record<string, unknown> = {
      task,
      relatedFeature: task.feature,
      phase: state.phase,
    }
    if (task.feature) {
      context.featureBible = `04-features/${task.feature}.md`
    }
    return context
  },

  get_bible_status: () => {
    const biblePath = join(getProjectRoot(), "docs", "bible")
    if (!existsSync(biblePath)) {
      return { error: "Bible directory not found" }
    }

    const status: Record<string, { fileCount: number; files: string[] }> = {}
    const sections = readdirSync(biblePath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))

    for (const section of sections) {
      const sectionPath = join(biblePath, section.name)
      const files = readdirSync(sectionPath).filter((f) => f.endsWith(".md"))
      status[section.name] = { fileCount: files.length, files }
    }
    return { bibleStatus: status }
  },

  sync_bible_decisions: () => {
    loadState()
    const state = getState()
    const decisionsPath = join(getProjectRoot(), "docs", "bible", "DECISIONS.md")

    if (!existsSync(decisionsPath)) {
      return { success: false, error: "DECISIONS.md not found at docs/bible/DECISIONS.md" }
    }

    const content = readFileSync(decisionsPath, "utf-8")
    const parsedDecisions = parseDecisionsFromMarkdown(content)

    let added = 0
    let updated = 0

    for (const decision of parsedDecisions) {
      const existingIndex = state.decisions.findIndex((d) => d.id === decision.id)
      if (existingIndex >= 0) {
        state.decisions[existingIndex] = { ...state.decisions[existingIndex], ...decision }
        updated++
      } else {
        state.decisions.push(decision)
        added++
      }
    }

    saveState()

    return {
      success: true,
      total: parsedDecisions.length,
      added,
      updated,
      decisions: state.decisions.map((d) => ({ id: d.id, title: d.title })),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "get_bible_sections_for_role",
    description: "Get Bible sections relevant to a specific role",
    inputSchema: {
      type: "object" as const,
      properties: { role: { type: "string" } },
      required: ["role"],
    },
  },
  {
    name: "get_bible_section",
    description: "Get content from a specific Bible section",
    inputSchema: {
      type: "object" as const,
      properties: { section: { type: "string" } },
      required: ["section"],
    },
  },
  {
    name: "get_task_context",
    description: "Get full context for a specific task including related Bible sections",
    inputSchema: {
      type: "object" as const,
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "get_bible_status",
    description: "Get Bible documentation status overview",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "sync_bible_decisions",
    description: "Parse DECISIONS.md and sync all decisions to MCP state. Run this to import all P-xxx, T-xxx, B-xxx decisions from Bible.",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
