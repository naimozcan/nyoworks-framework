// ═══════════════════════════════════════════════════════════════════════════════
// Shared Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// API Response
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: PaginationMeta
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─────────────────────────────────────────────────────────────────────────────
// User Context
// ─────────────────────────────────────────────────────────────────────────────

export interface UserContext {
  id: string
  tenantId: string
  email: string
  name: string
  role: string
  permissions: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureManifest {
  id: string
  name: string
  version: string
  description: string
  dependencies: {
    required: string[]
    optional: string[]
  }
  database: {
    tables: string[]
  }
  api: {
    routes: string[]
  }
  env: {
    required: string[]
    optional: string[]
  }
  bible: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  project: {
    name: string
    code: string
    type: "saas" | "whitelabel" | "custom"
  }
  features: {
    enabled: string[]
    disabled: string[]
  }
  delivery: {
    model: "saas" | "whitelabel" | "single"
    region: string
  }
  i18n: {
    default: string
    supported: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowPhase =
  | "DISCOVERY"
  | "ARCHITECTURE"
  | "PLANNING"
  | "BACKEND"
  | "FRONTEND"
  | "QA"
  | "DEPLOYMENT"

export type AgentRole =
  | "lead"
  | "architect"
  | "backend"
  | "frontend"
  | "data"
  | "qa"
  | "devops"

export interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "blocked"
  assignee?: AgentRole
  feature?: string
  priority: "low" | "medium" | "high" | "critical"
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface TaskLock {
  taskId: string
  agentRole: AgentRole
  claimedAt: Date
  expiresAt: Date
}
