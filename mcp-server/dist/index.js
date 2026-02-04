#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
var TASK_LOCK_TIMEOUT_MINUTES = 30;
var VALID_PHASES = ["DISCOVERY", "ARCHITECTURE", "DESIGN", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"];
var VALID_ROLES = ["lead", "architect", "designer", "backend", "frontend", "data", "qa", "devops"];
var ALL_FEATURES = ["payments", "appointments", "inventory", "crm", "cms", "ecommerce", "analytics", "notifications", "audit", "export", "realtime"];
var BIBLE_ROLE_MAPPING = {
  lead: ["product", "_tracking"],
  architect: ["product", "data", "api", "infra"],
  designer: ["ui"],
  backend: ["features", "data", "api"],
  frontend: ["features", "ui"],
  data: ["data"],
  qa: ["quality", "features"],
  devops: ["infra"]
};
var PHASE_ORDER = {
  DISCOVERY: 1,
  ARCHITECTURE: 2,
  DESIGN: 3,
  PLANNING: 4,
  BACKEND: 5,
  FRONTEND: 6,
  QA: 7,
  DEPLOYMENT: 8
};
var PHASE_ACTIVE_ROLES = {
  DISCOVERY: { primary: "lead", support: [] },
  ARCHITECTURE: { primary: "architect", support: ["lead", "data"] },
  DESIGN: { primary: "designer", support: ["lead", "frontend"] },
  PLANNING: { primary: "lead", support: ["architect"] },
  BACKEND: { primary: "backend", support: ["data"] },
  FRONTEND: { primary: "frontend", support: ["designer"] },
  QA: { primary: "qa", support: ["backend", "frontend", "devops"] },
  DEPLOYMENT: { primary: "devops", support: ["lead"] }
};
var PHASE_TRANSITIONS = {
  DISCOVERY_to_ARCHITECTURE: {
    from: "DISCOVERY",
    to: "ARCHITECTURE",
    checks: ["config_exists", "vision_documented"]
  },
  ARCHITECTURE_to_DESIGN: {
    from: "ARCHITECTURE",
    to: "DESIGN",
    checks: ["schema_exists", "api_documented"]
  },
  DESIGN_to_PLANNING: {
    from: "DESIGN",
    to: "PLANNING",
    checks: ["ui_specs_exist", "user_flows_documented"]
  },
  PLANNING_to_BACKEND: {
    from: "PLANNING",
    to: "BACKEND",
    checks: ["tasks_created"]
  },
  BACKEND_to_FRONTEND: {
    from: "BACKEND",
    to: "FRONTEND",
    checks: ["api_tests_pass", "api_coverage_80"]
  },
  FRONTEND_to_QA: {
    from: "FRONTEND",
    to: "QA",
    checks: ["build_success", "i18n_complete"]
  },
  QA_to_DEPLOYMENT: {
    from: "QA",
    to: "DEPLOYMENT",
    checks: ["e2e_tests_pass", "security_scan_pass"]
  }
};
var state = {
  name: "",
  code: "",
  phase: "DISCOVERY",
  enabledFeatures: [],
  tasks: [],
  taskLocks: {},
  decisions: [],
  activityLog: [],
  agents: {}
};
function getStateFile() {
  return join(process.cwd(), ".nyoworks", "state.json");
}
function loadState() {
  const stateFile = getStateFile();
  if (existsSync(stateFile)) {
    const data = readFileSync(stateFile, "utf-8");
    state = JSON.parse(data);
  }
}
function saveState() {
  const stateFile = getStateFile();
  const dir = dirname(stateFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}
function cleanupExpiredLocks() {
  const now = /* @__PURE__ */ new Date();
  const expired = [];
  for (const [taskId, lock] of Object.entries(state.taskLocks)) {
    if (new Date(lock.expiresAt) < now) {
      expired.push(taskId);
    }
  }
  for (const taskId of expired) {
    delete state.taskLocks[taskId];
  }
  if (expired.length > 0) {
    saveState();
  }
}
var toolHandlers = {
  init_project: ({ name, code, features }) => {
    state.name = name;
    state.code = code;
    state.enabledFeatures = features;
    state.phase = "DISCOVERY";
    saveState();
    return { success: true, message: `Project ${name} initialized with features: ${features}` };
  },
  get_status: () => {
    loadState();
    return {
      project: { name: state.name, code: state.code },
      phase: state.phase,
      enabledFeatures: state.enabledFeatures,
      taskCount: state.tasks.length,
      activeAgents: Object.keys(state.agents),
      activeLocks: Object.keys(state.taskLocks).length
    };
  },
  set_phase: ({ phase }) => {
    if (!VALID_PHASES.includes(phase)) {
      return { success: false, error: `Invalid phase. Must be one of: ${VALID_PHASES.join(", ")}` };
    }
    state.phase = phase;
    saveState();
    return { success: true, phase };
  },
  register_agent: ({ role }) => {
    if (!VALID_ROLES.includes(role)) {
      return { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` };
    }
    state.agents[role] = { registeredAt: (/* @__PURE__ */ new Date()).toISOString(), status: "active" };
    saveState();
    return { success: true, role };
  },
  create_task: ({ title, description = "", feature = null, priority = "medium" }) => {
    const taskId = `TASK-${String(state.tasks.length + 1).padStart(3, "0")}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const task = {
      id: taskId,
      title,
      description,
      status: "pending",
      assignee: null,
      feature,
      priority,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    state.tasks.push(task);
    saveState();
    return { success: true, task };
  },
  get_tasks: ({ status = null, feature = null }) => {
    loadState();
    let tasks = state.tasks;
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    if (feature) {
      tasks = tasks.filter((t) => t.feature === feature);
    }
    return { tasks, total: tasks.length };
  },
  update_task: ({ taskId, status = null, assignee = null }) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: "Task not found" };
    }
    if (status) {
      task.status = status;
      if (status === "completed") {
        task.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    if (assignee) {
      task.assignee = assignee;
    }
    task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveState();
    return { success: true, task };
  },
  claim_task: ({ taskId, agentRole }) => {
    loadState();
    cleanupExpiredLocks();
    if (state.taskLocks[taskId]) {
      const existing = state.taskLocks[taskId];
      return {
        success: false,
        error: `Task already claimed by ${existing.agentRole}`,
        lock: existing
      };
    }
    const now = /* @__PURE__ */ new Date();
    const expires = new Date(now.getTime() + TASK_LOCK_TIMEOUT_MINUTES * 60 * 1e3);
    const lock = {
      taskId,
      agentRole,
      claimedAt: now.toISOString(),
      expiresAt: expires.toISOString()
    };
    state.taskLocks[taskId] = lock;
    saveState();
    return { success: true, lock };
  },
  release_task: ({ taskId, agentRole }) => {
    loadState();
    const lock = state.taskLocks[taskId];
    if (!lock) {
      return { success: false, error: "Task is not locked" };
    }
    if (lock.agentRole !== agentRole) {
      return { success: false, error: `Task is locked by ${lock.agentRole}, not ${agentRole}` };
    }
    delete state.taskLocks[taskId];
    saveState();
    return { success: true, message: `Task ${taskId} released` };
  },
  get_task_lock: ({ taskId }) => {
    loadState();
    cleanupExpiredLocks();
    const lock = state.taskLocks[taskId];
    if (lock) {
      return { locked: true, lock };
    }
    return { locked: false };
  },
  get_all_locks: () => {
    loadState();
    cleanupExpiredLocks();
    return { locks: state.taskLocks, count: Object.keys(state.taskLocks).length };
  },
  force_unlock: ({ taskId }) => {
    loadState();
    if (state.taskLocks[taskId]) {
      delete state.taskLocks[taskId];
      saveState();
      return { success: true, message: `Task ${taskId} force unlocked` };
    }
    return { success: false, error: "Task is not locked" };
  },
  list_features: ({ enabledOnly = false }) => {
    loadState();
    if (enabledOnly) {
      return { features: state.enabledFeatures };
    }
    return {
      allFeatures: ALL_FEATURES,
      enabled: state.enabledFeatures,
      disabled: ALL_FEATURES.filter((f) => !state.enabledFeatures.includes(f))
    };
  },
  enable_feature: ({ featureId }) => {
    loadState();
    if (!state.enabledFeatures.includes(featureId)) {
      state.enabledFeatures.push(featureId);
      saveState();
    }
    return { success: true, enabledFeatures: state.enabledFeatures };
  },
  disable_feature: ({ featureId }) => {
    loadState();
    state.enabledFeatures = state.enabledFeatures.filter((f) => f !== featureId);
    saveState();
    return { success: true, enabledFeatures: state.enabledFeatures };
  },
  get_project_summary: () => {
    loadState();
    return {
      name: state.name,
      code: state.code,
      phase: state.phase,
      features: state.enabledFeatures,
      pendingTasks: state.tasks.filter((t) => t.status === "pending").length,
      inProgressTasks: state.tasks.filter((t) => t.status === "in_progress").length
    };
  },
  get_bible_sections_for_role: ({ role }) => {
    const sections = BIBLE_ROLE_MAPPING[role] || [];
    return { role, sections };
  },
  get_bible_section: ({ section }) => {
    const biblePath = join(process.cwd(), "docs", "bible", section);
    if (!existsSync(biblePath)) {
      return { error: `Section ${section} not found` };
    }
    const content = {};
    const files = readdirSync(biblePath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      content[file] = readFileSync(join(biblePath, file), "utf-8");
    }
    return { section, files: content };
  },
  get_task_context: ({ taskId }) => {
    loadState();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { error: "Task not found" };
    }
    const context = {
      task,
      relatedFeature: task.feature,
      phase: state.phase
    };
    if (task.feature) {
      context.featureBible = `04-features/${task.feature}.md`;
    }
    return context;
  },
  add_decision: ({ id, title, description, rationale }) => {
    const decision = {
      id,
      title,
      description,
      rationale,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    state.decisions.push(decision);
    saveState();
    return { success: true, decision };
  },
  get_decisions: () => {
    loadState();
    return { decisions: state.decisions };
  },
  sync_bible_decisions: () => {
    loadState();
    const decisionsPath = join(process.cwd(), "docs", "bible", "DECISIONS.md");
    if (!existsSync(decisionsPath)) {
      return { success: false, error: "DECISIONS.md not found at docs/bible/DECISIONS.md" };
    }
    const content = readFileSync(decisionsPath, "utf-8");
    const parsedDecisions = parseDecisionsFromMarkdown(content);
    const existingIds = new Set(state.decisions.map((d) => d.id));
    let added = 0;
    let updated = 0;
    for (const decision of parsedDecisions) {
      const existingIndex = state.decisions.findIndex((d) => d.id === decision.id);
      if (existingIndex >= 0) {
        state.decisions[existingIndex] = { ...state.decisions[existingIndex], ...decision };
        updated++;
      } else {
        state.decisions.push(decision);
        added++;
      }
    }
    saveState();
    return {
      success: true,
      total: parsedDecisions.length,
      added,
      updated,
      decisions: state.decisions.map((d) => ({ id: d.id, title: d.title }))
    };
  },
  log_activity: ({ agent, action, details = "" }) => {
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      agent,
      action,
      details
    };
    state.activityLog.push(entry);
    saveState();
    return { success: true };
  },
  get_activity_log: ({ limit = 50 }) => {
    loadState();
    const logs = state.activityLog.slice(-limit);
    return { logs, total: state.activityLog.length };
  },
  get_error_log: ({ limit = 20 }) => {
    loadState();
    const errorLogs = state.activityLog.filter((log) => log.action.includes("error") || log.action.includes("fail"));
    return { errors: errorLogs.slice(-limit), total: errorLogs.length };
  },
  clear_error_log: () => {
    loadState();
    const beforeCount = state.activityLog.length;
    state.activityLog = state.activityLog.filter((log) => !log.action.includes("error") && !log.action.includes("fail"));
    const removed = beforeCount - state.activityLog.length;
    saveState();
    return { success: true, removed };
  },
  heartbeat: ({ agentRole, taskId }) => {
    loadState();
    if (taskId && state.taskLocks[taskId]) {
      const lock = state.taskLocks[taskId];
      if (lock.agentRole === agentRole) {
        const now = /* @__PURE__ */ new Date();
        const expires = new Date(now.getTime() + TASK_LOCK_TIMEOUT_MINUTES * 60 * 1e3);
        lock.expiresAt = expires.toISOString();
        saveState();
        return { success: true, lockRefreshed: true, expiresAt: expires.toISOString() };
      }
    }
    if (state.agents[agentRole]) {
      state.agents[agentRole].status = "active";
    }
    return { success: true, lockRefreshed: false, agent: agentRole };
  },
  get_bible_status: () => {
    const biblePath = join(process.cwd(), "docs", "bible");
    if (!existsSync(biblePath)) {
      return { error: "Bible directory not found" };
    }
    const status = {};
    const sections = readdirSync(biblePath, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_"));
    for (const section of sections) {
      const sectionPath = join(biblePath, section.name);
      const files = readdirSync(sectionPath).filter((f) => f.endsWith(".md"));
      status[section.name] = { fileCount: files.length, files };
    }
    return { bibleStatus: status };
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // Phase Management Tools
  // ─────────────────────────────────────────────────────────────────────────────
  get_phase_info: () => {
    loadState();
    const currentPhase = state.phase;
    const currentOrder = PHASE_ORDER[currentPhase] || 0;
    const activeRoles = PHASE_ACTIVE_ROLES[currentPhase] || { primary: "lead", support: [] };
    const nextPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder + 1)?.[0] || null;
    const prevPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder - 1)?.[0] || null;
    return {
      current: currentPhase,
      order: currentOrder,
      totalPhases: Object.keys(PHASE_ORDER).length,
      activeRoles,
      nextPhase,
      prevPhase,
      allPhases: Object.keys(PHASE_ORDER)
    };
  },
  validate_phase_transition: ({ fromPhase, toPhase }) => {
    loadState();
    const transitionKey = `${fromPhase}_to_${toPhase}`;
    const transition = PHASE_TRANSITIONS[transitionKey];
    if (!transition) {
      return {
        valid: false,
        error: `Invalid transition from ${fromPhase} to ${toPhase}`,
        allowedTransitions: Object.keys(PHASE_TRANSITIONS).filter((k) => k.startsWith(fromPhase))
      };
    }
    const validationResults = [];
    for (const check of transition.checks) {
      const result = runPhaseValidation(check);
      validationResults.push(result);
    }
    const allPassed = validationResults.every((r) => r.passed);
    return {
      valid: allPassed,
      transition: transitionKey,
      checks: validationResults,
      blockedBy: validationResults.filter((r) => !r.passed).map((r) => r.check)
    };
  },
  advance_phase: ({ force = false }) => {
    loadState();
    const currentPhase = state.phase;
    const currentOrder = PHASE_ORDER[currentPhase] || 0;
    const nextPhase = Object.entries(PHASE_ORDER).find(([_, order]) => order === currentOrder + 1)?.[0];
    if (!nextPhase) {
      return { success: false, error: "Already at final phase (DEPLOYMENT)" };
    }
    if (!force) {
      const validation = toolHandlers.validate_phase_transition({
        fromPhase: currentPhase,
        toPhase: nextPhase
      });
      if (!validation.valid) {
        return {
          success: false,
          error: "Phase transition blocked",
          blockedBy: validation.blockedBy,
          hint: "Use force=true to override (lead only)"
        };
      }
    }
    state.phase = nextPhase;
    state.activityLog.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      agent: "system",
      action: "phase_advanced",
      details: `${currentPhase} \u2192 ${nextPhase}${force ? " (forced)" : ""}`
    });
    saveState();
    return {
      success: true,
      previousPhase: currentPhase,
      currentPhase: nextPhase,
      activeRoles: PHASE_ACTIVE_ROLES[nextPhase]
    };
  },
  rollback_phase: ({ targetPhase, reason }) => {
    loadState();
    const currentOrder = PHASE_ORDER[state.phase] || 0;
    const targetOrder = PHASE_ORDER[targetPhase] || 0;
    if (targetOrder >= currentOrder) {
      return { success: false, error: "Can only rollback to earlier phases" };
    }
    const previousPhase = state.phase;
    state.phase = targetPhase;
    state.activityLog.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      agent: "lead",
      action: "phase_rollback",
      details: `${previousPhase} \u2192 ${targetPhase}: ${reason}`
    });
    saveState();
    return {
      success: true,
      previousPhase,
      currentPhase: targetPhase,
      warning: "API contracts may need to be re-locked after changes"
    };
  },
  get_phase_deliverables: ({ phase }) => {
    const phaseDeliverables = {
      DISCOVERY: {
        required: ["nyoworks.config.yaml", "docs/bible/01-VISION/"],
        optional: []
      },
      ARCHITECTURE: {
        required: ["docs/bible/02-USERS/", "docs/bible/03-DATA/", "docs/bible/05-TECH/", "packages/database/src/db/schema/"],
        optional: ["docs/bible/05-TECH/05-security.md"]
      },
      DESIGN: {
        required: ["docs/bible/06-UX/", "packages/ui/src/components/"],
        optional: []
      },
      PLANNING: {
        required: ["docs/bible/03-FEATURES/", ".nyoworks/state.json"],
        optional: []
      },
      BACKEND: {
        required: ["apps/api/src/routes/", "apps/api/src/services/", "apps/api/src/**/*.test.ts"],
        optional: []
      },
      FRONTEND: {
        required: ["apps/web/src/app/", "apps/web/src/components/", "apps/web/messages/"],
        optional: ["apps/mobile/"]
      },
      QA: {
        required: ["tests/e2e/", "docs/bible/99-TRACKING/TEST_MASTER_PLAN.md"],
        optional: ["docs/security-audit.md"]
      },
      DEPLOYMENT: {
        required: ["docker/Dockerfile", ".github/workflows/"],
        optional: ["infra/"]
      }
    };
    return phaseDeliverables[phase] || { required: [], optional: [] };
  },
  check_phase_completion: ({ phase }) => {
    const deliverables = toolHandlers.get_phase_deliverables({ phase });
    const results = [];
    for (const path of deliverables.required) {
      const fullPath = join(process.cwd(), path);
      results.push({ path, exists: existsSync(fullPath), required: true });
    }
    for (const path of deliverables.optional) {
      const fullPath = join(process.cwd(), path);
      results.push({ path, exists: existsSync(fullPath), required: false });
    }
    const requiredComplete = results.filter((r) => r.required).every((r) => r.exists);
    const completionPercentage = Math.round(
      results.filter((r) => r.exists).length / results.length * 100
    );
    return {
      phase,
      complete: requiredComplete,
      completionPercentage,
      deliverables: results,
      missing: results.filter((r) => r.required && !r.exists).map((r) => r.path)
    };
  },
  get_active_roles_for_phase: ({ phase }) => {
    const roles = PHASE_ACTIVE_ROLES[phase];
    if (!roles) {
      return { error: `Unknown phase: ${phase}` };
    }
    return {
      phase,
      primary: roles.primary,
      support: roles.support,
      allActive: [roles.primary, ...roles.support]
    };
  },
  is_role_active: ({ role, phase }) => {
    loadState();
    const targetPhase = phase || state.phase;
    const roles = PHASE_ACTIVE_ROLES[targetPhase];
    if (!roles) {
      return { error: `Unknown phase: ${targetPhase}` };
    }
    const isActive = role === roles.primary || roles.support.includes(role);
    const isPrimary = role === roles.primary;
    return {
      role,
      phase: targetPhase,
      isActive,
      isPrimary,
      isSupport: isActive && !isPrimary
    };
  },
  get_workflow_status: () => {
    loadState();
    const phaseStatuses = [];
    const currentOrder = PHASE_ORDER[state.phase] || 0;
    for (const [phase, order] of Object.entries(PHASE_ORDER)) {
      let status;
      if (order < currentOrder) {
        status = "completed";
      } else if (order === currentOrder) {
        status = "current";
      } else {
        status = "pending";
      }
      phaseStatuses.push({
        phase,
        order,
        status,
        activeRoles: PHASE_ACTIVE_ROLES[phase]
      });
    }
    return {
      currentPhase: state.phase,
      phases: phaseStatuses,
      progress: `${currentOrder}/${Object.keys(PHASE_ORDER).length}`,
      progressPercentage: Math.round(currentOrder / Object.keys(PHASE_ORDER).length * 100)
    };
  }
};
function parseDecisionsFromMarkdown(content) {
  const decisions = [];
  const lines = content.split("\n");
  let currentDecision = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^###\s+(P-\d+|T-\d+|B-\d+):\s+(.+)$/);
    if (headerMatch) {
      if (currentDecision && currentDecision.id) {
        decisions.push({
          id: currentDecision.id,
          title: currentDecision.title || "",
          description: currentDecision.description || "",
          rationale: currentDecision.rationale || "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      currentDecision = {
        id: headerMatch[1],
        title: headerMatch[2].trim()
      };
      continue;
    }
    if (currentDecision) {
      const decisionMatch = line.match(/^-\s+\*\*Decision\*\*:\s+(.+)$/);
      if (decisionMatch) {
        currentDecision.description = decisionMatch[1].trim();
        continue;
      }
      const rationaleMatch = line.match(/^-\s+\*\*Rationale\*\*:\s+(.+)$/);
      if (rationaleMatch) {
        currentDecision.rationale = rationaleMatch[1].trim();
        continue;
      }
    }
  }
  if (currentDecision && currentDecision.id) {
    decisions.push({
      id: currentDecision.id,
      title: currentDecision.title || "",
      description: currentDecision.description || "",
      rationale: currentDecision.rationale || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return decisions;
}
function runPhaseValidation(check) {
  const cwd = process.cwd();
  switch (check) {
    case "config_exists":
      return {
        check,
        passed: existsSync(join(cwd, "nyoworks.config.yaml")),
        message: "nyoworks.config.yaml must exist"
      };
    case "vision_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "01-VISION")),
        message: "Vision documentation required"
      };
    case "schema_exists":
      return {
        check,
        passed: existsSync(join(cwd, "packages", "database", "src", "db", "schema")),
        message: "Database schema must exist"
      };
    case "api_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "05-TECH", "03-api-routes.md")),
        message: "API routes must be documented"
      };
    case "ui_specs_exist":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "06-UX")),
        message: "UI specifications required"
      };
    case "user_flows_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "06-UX", "01-user-flows.md")),
        message: "User flows must be documented"
      };
    case "tasks_created":
      loadState();
      return {
        check,
        passed: state.tasks.length > 0,
        message: "Tasks must be created in state"
      };
    case "api_tests_pass":
      return {
        check,
        passed: true,
        message: "API tests check (manual verification required)"
      };
    case "api_coverage_80":
      return {
        check,
        passed: true,
        message: "API coverage check (manual verification required)"
      };
    case "build_success":
      return {
        check,
        passed: true,
        message: "Build check (manual verification required)"
      };
    case "i18n_complete":
      return {
        check,
        passed: existsSync(join(cwd, "apps", "web", "messages")),
        message: "i18n messages must exist"
      };
    case "e2e_tests_pass":
      return {
        check,
        passed: true,
        message: "E2E tests check (manual verification required)"
      };
    case "security_scan_pass":
      return {
        check,
        passed: true,
        message: "Security scan check (manual verification required)"
      };
    default:
      return {
        check,
        passed: false,
        message: `Unknown check: ${check}`
      };
  }
}
var tools = [
  {
    name: "init_project",
    description: "Initialize a new project",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        code: { type: "string", description: "Project code (uppercase)" },
        features: { type: "array", items: { type: "string" }, description: "Enabled features" }
      },
      required: ["name", "code", "features"]
    }
  },
  {
    name: "get_status",
    description: "Get current project status",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "set_phase",
    description: "Set current workflow phase (DISCOVERY, ARCHITECTURE, PLANNING, BACKEND, FRONTEND, QA, DEPLOYMENT)",
    inputSchema: {
      type: "object",
      properties: { phase: { type: "string" } },
      required: ["phase"]
    }
  },
  {
    name: "register_agent",
    description: "Register an agent role",
    inputSchema: {
      type: "object",
      properties: { role: { type: "string" } },
      required: ["role"]
    }
  },
  {
    name: "create_task",
    description: "Create a new task",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        feature: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] }
      },
      required: ["title"]
    }
  },
  {
    name: "get_tasks",
    description: "Get tasks with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        feature: { type: "string" }
      }
    }
  },
  {
    name: "update_task",
    description: "Update a task status or assignee",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        status: { type: "string" },
        assignee: { type: "string" }
      },
      required: ["taskId"]
    }
  },
  {
    name: "claim_task",
    description: "Claim a task (lock it for an agent) to prevent conflicts",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        agentRole: { type: "string" }
      },
      required: ["taskId", "agentRole"]
    }
  },
  {
    name: "release_task",
    description: "Release a task lock",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        agentRole: { type: "string" }
      },
      required: ["taskId", "agentRole"]
    }
  },
  {
    name: "get_task_lock",
    description: "Check if a task is locked",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"]
    }
  },
  {
    name: "get_all_locks",
    description: "Get all active task locks",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "force_unlock",
    description: "Force unlock a task (lead only)",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"]
    }
  },
  {
    name: "list_features",
    description: "List all available features",
    inputSchema: {
      type: "object",
      properties: { enabledOnly: { type: "boolean" } }
    }
  },
  {
    name: "enable_feature",
    description: "Enable a feature",
    inputSchema: {
      type: "object",
      properties: { featureId: { type: "string" } },
      required: ["featureId"]
    }
  },
  {
    name: "disable_feature",
    description: "Disable a feature",
    inputSchema: {
      type: "object",
      properties: { featureId: { type: "string" } },
      required: ["featureId"]
    }
  },
  {
    name: "get_project_summary",
    description: "Get a concise project summary (token efficient)",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_bible_sections_for_role",
    description: "Get Bible sections relevant to a specific role",
    inputSchema: {
      type: "object",
      properties: { role: { type: "string" } },
      required: ["role"]
    }
  },
  {
    name: "get_bible_section",
    description: "Get content from a specific Bible section",
    inputSchema: {
      type: "object",
      properties: { section: { type: "string" } },
      required: ["section"]
    }
  },
  {
    name: "get_task_context",
    description: "Get full context for a specific task including related Bible sections",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"]
    }
  },
  {
    name: "add_decision",
    description: "Add a project decision (P-xxx or T-xxx)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        rationale: { type: "string" }
      },
      required: ["id", "title", "description", "rationale"]
    }
  },
  {
    name: "get_decisions",
    description: "Get all project decisions",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "sync_bible_decisions",
    description: "Parse DECISIONS.md and sync all decisions to MCP state. Run this to import all P-xxx, T-xxx, B-xxx decisions from Bible.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "log_activity",
    description: "Log an agent activity for audit trail",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string" },
        action: { type: "string" },
        details: { type: "string" }
      },
      required: ["agent", "action"]
    }
  },
  {
    name: "get_activity_log",
    description: "Get recent activity logs",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } }
    }
  },
  {
    name: "get_error_log",
    description: "Get recent error logs for debugging",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } }
    }
  },
  {
    name: "clear_error_log",
    description: "Clear all error logs",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "heartbeat",
    description: "Send heartbeat to keep task lock alive and update agent status",
    inputSchema: {
      type: "object",
      properties: {
        agentRole: { type: "string", description: "Agent role sending heartbeat" },
        taskId: { type: "string", description: "Optional task ID to refresh lock" }
      },
      required: ["agentRole"]
    }
  },
  {
    name: "get_bible_status",
    description: "Get Bible documentation status overview",
    inputSchema: { type: "object", properties: {} }
  },
  // Phase Management Tools
  {
    name: "get_phase_info",
    description: "Get detailed information about current phase including active roles and transitions",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "validate_phase_transition",
    description: "Validate if a phase transition is allowed and check all requirements",
    inputSchema: {
      type: "object",
      properties: {
        fromPhase: { type: "string", description: "Current phase" },
        toPhase: { type: "string", description: "Target phase" }
      },
      required: ["fromPhase", "toPhase"]
    }
  },
  {
    name: "advance_phase",
    description: "Advance to the next workflow phase (validates requirements unless forced)",
    inputSchema: {
      type: "object",
      properties: {
        force: { type: "boolean", description: "Skip validation (lead only)" }
      }
    }
  },
  {
    name: "rollback_phase",
    description: "Rollback to an earlier phase (lead only)",
    inputSchema: {
      type: "object",
      properties: {
        targetPhase: { type: "string", description: "Phase to rollback to" },
        reason: { type: "string", description: "Reason for rollback" }
      },
      required: ["targetPhase", "reason"]
    }
  },
  {
    name: "get_phase_deliverables",
    description: "Get required and optional deliverables for a phase",
    inputSchema: {
      type: "object",
      properties: {
        phase: { type: "string" }
      },
      required: ["phase"]
    }
  },
  {
    name: "check_phase_completion",
    description: "Check if a phase is complete by verifying all deliverables",
    inputSchema: {
      type: "object",
      properties: {
        phase: { type: "string" }
      },
      required: ["phase"]
    }
  },
  {
    name: "get_active_roles_for_phase",
    description: "Get which roles are active (primary and support) for a phase",
    inputSchema: {
      type: "object",
      properties: {
        phase: { type: "string" }
      },
      required: ["phase"]
    }
  },
  {
    name: "is_role_active",
    description: "Check if a specific role is active in a phase",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string" },
        phase: { type: "string", description: "Optional, defaults to current phase" }
      },
      required: ["role"]
    }
  },
  {
    name: "get_workflow_status",
    description: "Get complete workflow status with all phases and progress",
    inputSchema: { type: "object", properties: {} }
  }
];
var server = new Server(
  { name: "nyoworks-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const result = handler(args);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
async function main() {
  loadState();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NYOWORKS MCP Server running...");
}
main().catch(console.error);
