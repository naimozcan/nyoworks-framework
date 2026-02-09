// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Multi-App Tools (FAZ 6)
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { parse } from "yaml"
import { getState, saveState, getProjectRoot } from "../state.js"
import type { ToolHandler, ToolDefinition, AppProduct } from "../types.js"

// ─────────────────────────────────────────────────────────────────────────────
// Config Loading
// ─────────────────────────────────────────────────────────────────────────────

interface AppsConfigYaml {
  project: {
    name: string
    code: string
    slug: string
    database: string
    language: string
  }
  products: Record<string, {
    name: string
    name_tr: string
    platforms: string[]
    features: string[]
  }>
  shared_features: string[]
  providers: Record<string, string>
  security: {
    rls_enabled: boolean
    app_scoped_routes: boolean
    branded_validators: boolean
  }
}

function loadMultiAppConfig(): AppsConfigYaml | null {
  const configPath = join(getProjectRoot(), "config", "apps.config.yaml")
  if (!existsSync(configPath)) {
    return null
  }

  try {
    const content = readFileSync(configPath, "utf-8")
    return parse(content) as AppsConfigYaml
  } catch {
    return null
  }
}

function initializeMultiAppState(): void {
  const state = getState()
  const config = loadMultiAppConfig()

  if (!config) {
    return
  }

  if (!state.multiApp) {
    state.multiApp = {
      currentAppId: null,
      apps: {},
    }
  }

  for (const [appId, appConfig] of Object.entries(config.products)) {
    if (!state.multiApp.apps[appId]) {
      state.multiApp.apps[appId] = {
        id: appId,
        name: appConfig.name,
        name_tr: appConfig.name_tr,
        platforms: appConfig.platforms as ("web" | "mobile" | "desktop")[],
        features: appConfig.features,
        phase: "DISCOVERY",
        tasks: [],
        specs: [],
      }
    }
  }

  if (!state.multiApp.currentAppId && Object.keys(state.multiApp.apps).length > 0) {
    state.multiApp.currentAppId = Object.keys(state.multiApp.apps)[0]
  }

  saveState()
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handlers
// ─────────────────────────────────────────────────────────────────────────────

const listApps: ToolHandler = () => {
  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  const multiApp = state.multiApp

  if (!multiApp || Object.keys(multiApp.apps).length === 0) {
    return {
      success: false,
      message: "No multi-app configuration found. This appears to be a single-app project.",
      apps: [],
    }
  }

  const apps = Object.values(multiApp.apps).map((app) => ({
    id: app.id,
    name: app.name,
    name_tr: app.name_tr,
    platforms: app.platforms,
    features: app.features,
    phase: app.phase,
    taskCount: app.tasks.length,
    pendingTasks: app.tasks.filter((t) => t.status === "pending").length,
    inProgressTasks: app.tasks.filter((t) => t.status === "in_progress").length,
    completedTasks: app.tasks.filter((t) => t.status === "completed").length,
    isCurrent: app.id === multiApp.currentAppId,
  }))

  return {
    success: true,
    currentAppId: multiApp.currentAppId,
    apps,
    totalApps: apps.length,
  }
}

const selectApp: ToolHandler = (args) => {
  const { appId } = args as { appId: string }

  if (!appId) {
    return { success: false, error: "appId is required" }
  }

  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp) {
    return { success: false, error: "No multi-app configuration found" }
  }

  if (!state.multiApp.apps[appId]) {
    return {
      success: false,
      error: `App '${appId}' not found`,
      availableApps: Object.keys(state.multiApp.apps),
    }
  }

  state.multiApp.currentAppId = appId
  saveState()

  const app = state.multiApp.apps[appId]

  return {
    success: true,
    message: `Switched to app: ${app.name}`,
    currentApp: {
      id: app.id,
      name: app.name,
      name_tr: app.name_tr,
      platforms: app.platforms,
      features: app.features,
      phase: app.phase,
      taskCount: app.tasks.length,
    },
  }
}

const getCurrentApp: ToolHandler = () => {
  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp || !state.multiApp.currentAppId) {
    return {
      success: false,
      message: "No app selected. Use select_app to choose an app.",
      isMultiApp: !!state.multiApp,
    }
  }

  const appId = state.multiApp.currentAppId
  const app = state.multiApp.apps[appId]

  if (!app) {
    return { success: false, error: "Current app not found in state" }
  }

  return {
    success: true,
    app: {
      id: app.id,
      name: app.name,
      name_tr: app.name_tr,
      platforms: app.platforms,
      features: app.features,
      phase: app.phase,
      tasks: app.tasks,
      specs: app.specs || [],
    },
  }
}

const getAppTasks: ToolHandler = (args) => {
  const { appId, status, feature } = args as { appId?: string; status?: string; feature?: string }

  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp) {
    return {
      success: false,
      error: "No multi-app configuration found. Using global tasks.",
      tasks: state.tasks,
    }
  }

  const targetAppId = appId || state.multiApp.currentAppId

  if (!targetAppId) {
    return { success: false, error: "No app specified and no current app selected" }
  }

  const app = state.multiApp.apps[targetAppId]

  if (!app) {
    return { success: false, error: `App '${targetAppId}' not found` }
  }

  let tasks = app.tasks

  if (status) {
    tasks = tasks.filter((t) => t.status === status)
  }

  if (feature) {
    tasks = tasks.filter((t) => t.feature === feature)
  }

  return {
    success: true,
    appId: targetAppId,
    appName: app.name,
    tasks,
    totalTasks: tasks.length,
    byStatus: {
      pending: app.tasks.filter((t) => t.status === "pending").length,
      in_progress: app.tasks.filter((t) => t.status === "in_progress").length,
      completed: app.tasks.filter((t) => t.status === "completed").length,
      blocked: app.tasks.filter((t) => t.status === "blocked").length,
    },
  }
}

const createAppTask: ToolHandler = (args) => {
  const { appId, title, description, feature, priority, subTasks } = args as {
    appId?: string
    title: string
    description?: string
    feature?: string
    priority?: string
    subTasks?: string[]
  }

  if (!title) {
    return { success: false, error: "title is required" }
  }

  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp) {
    return { success: false, error: "No multi-app configuration found" }
  }

  const targetAppId = appId || state.multiApp.currentAppId

  if (!targetAppId) {
    return { success: false, error: "No app specified and no current app selected" }
  }

  const app = state.multiApp.apps[targetAppId]

  if (!app) {
    return { success: false, error: `App '${targetAppId}' not found` }
  }

  const taskId = `${targetAppId.toUpperCase()}-TASK-${String(app.tasks.length + 1).padStart(3, "0")}`
  const now = new Date().toISOString()

  const newTask = {
    id: taskId,
    title,
    description: description || "",
    status: "pending" as const,
    assignee: null,
    feature: feature || null,
    priority: (priority || "medium") as "low" | "medium" | "high" | "critical",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    progress: [],
    subTasks: (subTasks || []).map((st, i) => ({
      id: `${taskId}-SUB-${String(i + 1).padStart(2, "0")}`,
      title: st,
      status: "pending" as const,
      completedAt: null,
    })),
  }

  app.tasks.push(newTask)
  saveState()

  return {
    success: true,
    message: `Task created for app '${app.name}'`,
    task: newTask,
    appId: targetAppId,
  }
}

const setAppPhase: ToolHandler = (args) => {
  const { appId, phase } = args as { appId?: string; phase: string }

  if (!phase) {
    return { success: false, error: "phase is required" }
  }

  const validPhases = ["DISCOVERY", "ARCHITECTURE", "DESIGN", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"]

  if (!validPhases.includes(phase)) {
    return { success: false, error: `Invalid phase. Valid phases: ${validPhases.join(", ")}` }
  }

  const state = getState()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp) {
    return { success: false, error: "No multi-app configuration found" }
  }

  const targetAppId = appId || state.multiApp.currentAppId

  if (!targetAppId) {
    return { success: false, error: "No app specified and no current app selected" }
  }

  const app = state.multiApp.apps[targetAppId]

  if (!app) {
    return { success: false, error: `App '${targetAppId}' not found` }
  }

  const oldPhase = app.phase
  app.phase = phase
  saveState()

  return {
    success: true,
    message: `App '${app.name}' phase changed: ${oldPhase} -> ${phase}`,
    appId: targetAppId,
    oldPhase,
    newPhase: phase,
  }
}

const getMultiAppSummary: ToolHandler = () => {
  const state = getState()
  const config = loadMultiAppConfig()

  if (!state.multiApp) {
    initializeMultiAppState()
  }

  if (!state.multiApp || !config) {
    return {
      success: false,
      isMultiApp: false,
      message: "This is a single-app project",
      project: {
        name: state.name,
        code: state.code,
        phase: state.phase,
      },
    }
  }

  const apps = Object.values(state.multiApp.apps)

  const summary = {
    success: true,
    isMultiApp: true,
    project: config.project,
    currentAppId: state.multiApp.currentAppId,
    security: config.security,
    providers: config.providers,
    sharedFeatures: config.shared_features,
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
      platforms: app.platforms,
      phase: app.phase,
      progress: {
        total: app.tasks.length,
        completed: app.tasks.filter((t) => t.status === "completed").length,
        percentage: app.tasks.length > 0
          ? Math.round((app.tasks.filter((t) => t.status === "completed").length / app.tasks.length) * 100)
          : 0,
      },
    })),
    overallProgress: {
      totalTasks: apps.reduce((sum, app) => sum + app.tasks.length, 0),
      completedTasks: apps.reduce((sum, app) => sum + app.tasks.filter((t) => t.status === "completed").length, 0),
    },
  }

  return summary
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

const multiAppToolDefinitions: ToolDefinition[] = [
  {
    name: "list_apps",
    description: "List all apps/products in a multi-product project. Shows name, platforms, phase, and task counts for each app.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "select_app",
    description: "Select an app to work on. All subsequent app-scoped operations will target this app until changed.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "The app ID to select (e.g., 'ecommerce', 'crm', 'salon')" },
      },
      required: ["appId"],
    },
  },
  {
    name: "get_current_app",
    description: "Get details about the currently selected app including tasks, specs, and phase.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_app_tasks",
    description: "Get tasks for a specific app or the current app. Can filter by status and feature.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "App ID (optional, defaults to current app)" },
        status: { type: "string", description: "Filter by status: pending, in_progress, completed, blocked" },
        feature: { type: "string", description: "Filter by feature name" },
      },
    },
  },
  {
    name: "create_app_task",
    description: "Create a task for a specific app. Task IDs are prefixed with the app ID for isolation.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "App ID (optional, defaults to current app)" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        feature: { type: "string", description: "Related feature" },
        priority: { type: "string", description: "Priority: low, medium, high, critical" },
        subTasks: {
          type: "array",
          items: { type: "string" },
          description: "List of subtask titles",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "set_app_phase",
    description: "Set the workflow phase for a specific app. Each app can be in a different phase.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "App ID (optional, defaults to current app)" },
        phase: {
          type: "string",
          description: "Phase: DISCOVERY, ARCHITECTURE, DESIGN, PLANNING, BACKEND, FRONTEND, QA, DEPLOYMENT",
        },
      },
      required: ["phase"],
    },
  },
  {
    name: "get_multi_app_summary",
    description: "Get a comprehensive summary of all apps in the project including progress, security settings, and providers.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
]

const multiAppHandlers: Record<string, ToolHandler> = {
  list_apps: listApps,
  select_app: selectApp,
  get_current_app: getCurrentApp,
  get_app_tasks: getAppTasks,
  create_app_task: createAppTask,
  set_app_phase: setAppPhase,
  get_multi_app_summary: getMultiAppSummary,
}

export { multiAppToolDefinitions, multiAppHandlers, initializeMultiAppState }
