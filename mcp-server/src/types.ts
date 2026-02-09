// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

interface TaskLock {
  taskId: string
  agentRole: string
  claimedAt: string
  expiresAt: string
  lastHeartbeat: string
}

interface ErrorLog {
  timestamp: string
  tool: string
  error: string
  args: Record<string, unknown>
}

interface TaskProgress {
  timestamp: string
  note: string
  percentage: number
}

interface SubTask {
  id: string
  title: string
  status: "pending" | "completed"
  completedAt: string | null
}

interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "blocked"
  assignee: string | null
  feature: string | null
  priority: "low" | "medium" | "high" | "critical"
  createdAt: string
  updatedAt: string
  completedAt: string | null
  progress: TaskProgress[]
  subTasks: SubTask[]
}

interface Decision {
  id: string
  title: string
  description: string
  rationale: string
  createdAt: string
}

interface ActivityLog {
  timestamp: string
  agent: string
  action: string
  details: string
}

interface AgentHandoff {
  id: string
  fromAgent: string
  toAgent: string
  phaseTransition: string | null
  taskId: string | null
  summary: string
  artifacts: string[]
  apiContracts: string[]
  decisions: string[]
  warnings: string[]
  context: Record<string, unknown>
  status: "pending" | "acknowledged"
  createdAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
}

interface SubPhaseDefinition {
  id: string
  name: string
  description: string
  order: number
  primaryRole: string
  supportRoles: string[]
  exitCriteria: string[]
}

interface SubPhaseState {
  id: string
  status: "pending" | "current" | "completed"
  startedAt: string | null
  completedAt: string | null
}

interface Spec {
  id: string
  taskId: string
  type: "api" | "page" | "component" | "service" | "schema" | "test"
  title: string
  content: string
  bibleRefs: string[]
  createdBy: string
  createdAt: string
  approvedBy: string | null
  approvedAt: string | null
  status: "draft" | "approved" | "rejected"
  rejectionReason: string | null
}

interface ManualApproval {
  approvedBy: string
  approvedAt: string
  notes: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-App Types (FAZ 6)
// ─────────────────────────────────────────────────────────────────────────────

interface AppProduct {
  id: string
  name: string
  name_tr: string
  platforms: ("web" | "mobile" | "desktop")[]
  features: string[]
  phase: string
  tasks: Task[]
  specs?: Spec[]
}

interface MultiAppConfig {
  currentAppId: string | null
  apps: Record<string, AppProduct>
}

interface ProjectState {
  name: string
  code: string
  phase: string
  enabledFeatures: string[]
  tasks: Task[]
  taskLocks: Record<string, TaskLock>
  decisions: Decision[]
  activityLog: ActivityLog[]
  errorLog: ErrorLog[]
  agents: Record<string, { registeredAt: string; status: string; lastSeen: string }>
  handoffs?: AgentHandoff[]
  subPhaseDefinitions?: Record<string, SubPhaseDefinition[]>
  currentSubPhase?: string | null
  subPhaseHistory?: SubPhaseState[]
  specs?: Spec[]
  specRequired?: boolean
  manualApprovals?: Record<string, ManualApproval>
  targetPlatforms?: string[]
  multiApp?: MultiAppConfig
}

type ToolHandler = (args: Record<string, unknown>) => unknown

interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export type {
  TaskLock,
  ErrorLog,
  TaskProgress,
  SubTask,
  Task,
  Decision,
  ActivityLog,
  AgentHandoff,
  SubPhaseDefinition,
  SubPhaseState,
  Spec,
  ManualApproval,
  AppProduct,
  MultiAppConfig,
  ProjectState,
  ToolHandler,
  ToolDefinition,
}
