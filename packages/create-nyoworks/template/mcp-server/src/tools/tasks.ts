// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Task Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition, SubTask, Task, TaskProgress } from "../types.js"
import { getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  create_task: ({ title, description = "", feature = null, priority = "medium", subTasks = [] }) => {
    const state = getState()
    const taskId = `TASK-${String(state.tasks.length + 1).padStart(3, "0")}`
    const now = new Date().toISOString()

    const parsedSubTasks: SubTask[] = (subTasks as string[]).map((st, idx) => ({
      id: `${taskId}-SUB-${String(idx + 1).padStart(2, "0")}`,
      title: st,
      status: "pending",
      completedAt: null,
    }))

    const task: Task = {
      id: taskId,
      title: title as string,
      description: description as string,
      status: "pending",
      assignee: null,
      feature: feature as string | null,
      priority: priority as Task["priority"],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      progress: [],
      subTasks: parsedSubTasks,
    }
    state.tasks.push(task)
    saveState()
    return { success: true, task }
  },

  get_tasks: ({ status = null, feature = null }) => {
    loadState()
    const state = getState()
    let tasks = state.tasks
    if (status) {
      tasks = tasks.filter((t) => t.status === status)
    }
    if (feature) {
      tasks = tasks.filter((t) => t.feature === feature)
    }
    return { tasks, total: tasks.length }
  },

  update_task: ({ taskId, status = null, assignee = null }) => {
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: "Task not found" }
    }
    if (status) {
      task.status = status as Task["status"]
      if (status === "completed") {
        task.completedAt = new Date().toISOString()
      }
    }
    if (assignee) {
      task.assignee = assignee as string
    }
    task.updatedAt = new Date().toISOString()
    saveState()
    return { success: true, task }
  },

  add_task_progress: ({ taskId, note, percentage = 0 }) => {
    loadState()
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: "Task not found" }
    }

    if (!task.progress) {
      task.progress = []
    }

    const progressEntry: TaskProgress = {
      timestamp: new Date().toISOString(),
      note: note as string,
      percentage: Math.min(100, Math.max(0, percentage as number)),
    }

    task.progress.push(progressEntry)
    task.updatedAt = new Date().toISOString()

    if (task.status === "pending") {
      task.status = "in_progress"
    }

    saveState()
    return {
      success: true,
      taskId,
      progressCount: task.progress.length,
      latestProgress: progressEntry,
      overallPercentage: progressEntry.percentage,
    }
  },

  add_subtask: ({ taskId, title }) => {
    loadState()
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: "Task not found" }
    }

    if (!task.subTasks) {
      task.subTasks = []
    }

    const subTaskId = `${taskId}-SUB-${String(task.subTasks.length + 1).padStart(2, "0")}`
    const subTask: SubTask = {
      id: subTaskId,
      title: title as string,
      status: "pending",
      completedAt: null,
    }

    task.subTasks.push(subTask)
    task.updatedAt = new Date().toISOString()
    saveState()

    return { success: true, taskId, subTask, totalSubTasks: task.subTasks.length }
  },

  complete_subtask: ({ taskId, subTaskId }) => {
    loadState()
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: "Task not found" }
    }

    const subTask = task.subTasks?.find((st) => st.id === subTaskId)
    if (!subTask) {
      return { success: false, error: "SubTask not found" }
    }

    subTask.status = "completed"
    subTask.completedAt = new Date().toISOString()
    task.updatedAt = new Date().toISOString()

    const completedCount = task.subTasks.filter((st) => st.status === "completed").length
    const totalCount = task.subTasks.length
    const autoPercentage = Math.round((completedCount / totalCount) * 100)

    task.progress.push({
      timestamp: new Date().toISOString(),
      note: `Subtask completed: ${subTask.title}`,
      percentage: autoPercentage,
    })

    saveState()

    return {
      success: true,
      taskId,
      subTaskId,
      completedSubTasks: completedCount,
      totalSubTasks: totalCount,
      autoPercentage,
    }
  },

  get_task_progress: ({ taskId }) => {
    loadState()
    const state = getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: "Task not found" }
    }

    const completedSubTasks = task.subTasks?.filter((st) => st.status === "completed").length || 0
    const totalSubTasks = task.subTasks?.length || 0
    const latestProgress = task.progress?.[task.progress.length - 1]

    return {
      taskId,
      title: task.title,
      status: task.status,
      progressEntries: task.progress?.length || 0,
      latestProgress,
      subTaskProgress: totalSubTasks > 0 ? `${completedSubTasks}/${totalSubTasks}` : "No subtasks",
      subTasks: task.subTasks || [],
      progressHistory: task.progress || [],
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "create_task",
    description: "Create a new task with optional subtasks for modular work",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        feature: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        subTasks: { type: "array", items: { type: "string" }, description: "List of subtask titles for modular breakdown" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_tasks",
    description: "Get tasks with optional filters",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: { type: "string" },
        feature: { type: "string" },
      },
    },
  },
  {
    name: "update_task",
    description: "Update a task status or assignee",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string" },
        status: { type: "string" },
        assignee: { type: "string" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "add_task_progress",
    description: "Add incremental progress note to a task. Use this to log work done without creating new files. Progress is persisted in state and survives context resets.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Task ID to add progress to" },
        note: { type: "string", description: "Progress note (what was done, what's next)" },
        percentage: { type: "number", description: "Completion percentage (0-100)" },
      },
      required: ["taskId", "note"],
    },
  },
  {
    name: "add_subtask",
    description: "Add a subtask to break down a large task into smaller pieces",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Parent task ID" },
        title: { type: "string", description: "Subtask title" },
      },
      required: ["taskId", "title"],
    },
  },
  {
    name: "complete_subtask",
    description: "Mark a subtask as completed. Auto-updates task progress percentage.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Parent task ID" },
        subTaskId: { type: "string", description: "Subtask ID to complete" },
      },
      required: ["taskId", "subTaskId"],
    },
  },
  {
    name: "get_task_progress",
    description: "Get full progress history and subtask status for a task. Use this to resume work after context reset.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "Task ID to get progress for" },
      },
      required: ["taskId"],
    },
  },
]

export { handlers, definitions }
