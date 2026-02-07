// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - State Management
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs"
import { join, dirname, resolve } from "path"
import { randomBytes } from "crypto"
import { fileURLToPath } from "url"
import type { ProjectState, Decision } from "./types.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, "..", "..")

const DEFAULT_STATE: ProjectState = {
  name: "",
  code: "",
  phase: "DISCOVERY",
  enabledFeatures: [],
  tasks: [],
  taskLocks: {},
  decisions: [],
  activityLog: [],
  errorLog: [],
  agents: {},
}

let state: ProjectState = { ...DEFAULT_STATE }

function getProjectRoot(): string {
  return PROJECT_ROOT
}

function getStateFile(): string {
  return join(PROJECT_ROOT, ".nyoworks", "state.json")
}

function getState(): ProjectState {
  return state
}

function getDefaultState(): ProjectState {
  return { ...DEFAULT_STATE }
}

function loadState(): void {
  const stateFile = getStateFile()

  if (!existsSync(stateFile)) {
    state = { ...DEFAULT_STATE }
    return
  }

  try {
    const data = readFileSync(stateFile, "utf-8")
    const parsed = JSON.parse(data)

    if (!isValidState(parsed)) {
      console.error("[NYOWORKS] Invalid state structure, using defaults")
      state = { ...DEFAULT_STATE }
      return
    }

    state = parsed
  } catch (error) {
    console.error("[NYOWORKS] Failed to load state, using defaults:", error)
    state = { ...DEFAULT_STATE }
  }
}

function isValidState(obj: unknown): obj is ProjectState {
  if (!obj || typeof obj !== "object") return false

  const s = obj as Record<string, unknown>

  return (
    typeof s.name === "string" &&
    typeof s.code === "string" &&
    typeof s.phase === "string" &&
    Array.isArray(s.enabledFeatures) &&
    Array.isArray(s.tasks) &&
    typeof s.taskLocks === "object" &&
    s.taskLocks !== null &&
    Array.isArray(s.decisions) &&
    Array.isArray(s.activityLog) &&
    Array.isArray(s.errorLog) &&
    typeof s.agents === "object" &&
    s.agents !== null
  )
}

function saveState(): void {
  const stateFile = getStateFile()
  const dir = dirname(stateFile)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpFile = join(dir, `.state.${randomBytes(6).toString("hex")}.tmp`)
  writeFileSync(tmpFile, JSON.stringify(state, null, 2))
  renameSync(tmpFile, stateFile)
}

function parseDecisionsFromMarkdown(content: string): Decision[] {
  const decisions: Decision[] = []
  const lines = content.split("\n")

  let currentDecision: Partial<Decision> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const headerMatch = line.match(/^###\s+(P-\d+|T-\d+|B-\d+):\s+(.+)$/)
    if (headerMatch) {
      if (currentDecision && currentDecision.id) {
        decisions.push({
          id: currentDecision.id,
          title: currentDecision.title || "",
          description: currentDecision.description || "",
          rationale: currentDecision.rationale || "",
          createdAt: new Date().toISOString(),
        })
      }
      currentDecision = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
      }
      continue
    }

    if (currentDecision) {
      const decisionMatch = line.match(/^-\s+\*\*Decision\*\*:\s+(.+)$/)
      if (decisionMatch) {
        currentDecision.description = decisionMatch[1].trim()
        continue
      }

      const rationaleMatch = line.match(/^-\s+\*\*Rationale\*\*:\s+(.+)$/)
      if (rationaleMatch) {
        currentDecision.rationale = rationaleMatch[1].trim()
        continue
      }
    }
  }

  if (currentDecision && currentDecision.id) {
    decisions.push({
      id: currentDecision.id,
      title: currentDecision.title || "",
      description: currentDecision.description || "",
      rationale: currentDecision.rationale || "",
      createdAt: new Date().toISOString(),
    })
  }

  return decisions
}

function cleanupExpiredLocks(): void {
  const now = new Date()
  const expired: string[] = []

  for (const [taskId, lock] of Object.entries(state.taskLocks)) {
    if (new Date(lock.expiresAt) < now) {
      expired.push(taskId)
    }
  }

  for (const taskId of expired) {
    delete state.taskLocks[taskId]
  }

  if (expired.length > 0) {
    saveState()
  }
}

function logError(tool: string, error: string, args: Record<string, unknown>): void {
  loadState()
  if (!state.errorLog) {
    state.errorLog = []
  }
  state.errorLog.push({
    timestamp: new Date().toISOString(),
    tool,
    error,
    args,
  })
  if (state.errorLog.length > 100) {
    state.errorLog = state.errorLog.slice(-100)
  }
  saveState()
}

export {
  getProjectRoot,
  getState,
  getStateFile,
  getDefaultState,
  loadState,
  saveState,
  isValidState,
  parseDecisionsFromMarkdown,
  cleanupExpiredLocks,
  logError,
}
