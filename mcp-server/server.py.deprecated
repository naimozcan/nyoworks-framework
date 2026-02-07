#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════════
# NYOWORKS MCP Server - AI Team Orchestration
# ═══════════════════════════════════════════════════════════════════════════════

import json
import sys
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

TASK_LOCK_TIMEOUT_MINUTES = 30

# ─────────────────────────────────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TaskLock:
    task_id: str
    agent_role: str
    claimed_at: str
    expires_at: str

@dataclass
class Task:
    id: str
    title: str
    description: str
    status: str
    assignee: Optional[str]
    feature: Optional[str]
    priority: str
    created_at: str
    updated_at: str
    completed_at: Optional[str]

@dataclass
class ProjectState:
    name: str
    code: str
    phase: str
    enabled_features: list
    tasks: list
    task_locks: dict
    decisions: list
    activity_log: list
    agents: dict

# ─────────────────────────────────────────────────────────────────────────────
# State Management
# ─────────────────────────────────────────────────────────────────────────────

state = ProjectState(
    name="",
    code="",
    phase="DISCOVERY",
    enabled_features=[],
    tasks=[],
    task_locks={},
    decisions=[],
    activity_log=[],
    agents={}
)

def get_state_file():
    return Path(os.getcwd()) / ".nyoworks" / "state.json"

def load_state():
    global state
    state_file = get_state_file()
    if state_file.exists():
        with open(state_file, "r") as f:
            data = json.load(f)
            state = ProjectState(**data)

def save_state():
    state_file = get_state_file()
    state_file.parent.mkdir(parents=True, exist_ok=True)
    with open(state_file, "w") as f:
        json.dump(asdict(state), f, indent=2)

# ─────────────────────────────────────────────────────────────────────────────
# MCP Protocol
# ─────────────────────────────────────────────────────────────────────────────

def send_response(id, result):
    response = {"jsonrpc": "2.0", "id": id, "result": result}
    print(json.dumps(response), flush=True)

def send_error(id, code, message):
    response = {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}
    print(json.dumps(response), flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# Tool Implementations
# ─────────────────────────────────────────────────────────────────────────────

def tool_init_project(name: str, code: str, features: list):
    global state
    state.name = name
    state.code = code
    state.enabled_features = features
    state.phase = "DISCOVERY"
    save_state()
    return {"success": True, "message": f"Project {name} initialized with features: {features}"}

def tool_get_status():
    load_state()
    return {
        "project": {"name": state.name, "code": state.code},
        "phase": state.phase,
        "enabled_features": state.enabled_features,
        "task_count": len(state.tasks),
        "active_agents": list(state.agents.keys()),
        "active_locks": len(state.task_locks)
    }

def tool_set_phase(phase: str):
    valid_phases = ["DISCOVERY", "ARCHITECTURE", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"]
    if phase not in valid_phases:
        return {"success": False, "error": f"Invalid phase. Must be one of: {valid_phases}"}
    state.phase = phase
    save_state()
    return {"success": True, "phase": phase}

def tool_register_agent(role: str):
    valid_roles = ["lead", "architect", "backend", "frontend", "data", "qa", "devops"]
    if role not in valid_roles:
        return {"success": False, "error": f"Invalid role. Must be one of: {valid_roles}"}
    state.agents[role] = {"registered_at": datetime.now().isoformat(), "status": "active"}
    save_state()
    return {"success": True, "role": role}

# ─────────────────────────────────────────────────────────────────────────────
# Task Management
# ─────────────────────────────────────────────────────────────────────────────

def tool_create_task(title: str, description: str = "", feature: str = None, priority: str = "medium"):
    task_id = f"TASK-{len(state.tasks) + 1:03d}"
    now = datetime.now().isoformat()
    task = Task(
        id=task_id,
        title=title,
        description=description,
        status="pending",
        assignee=None,
        feature=feature,
        priority=priority,
        created_at=now,
        updated_at=now,
        completed_at=None
    )
    state.tasks.append(asdict(task))
    save_state()
    return {"success": True, "task": asdict(task)}

def tool_get_tasks(status: str = None, feature: str = None):
    load_state()
    tasks = state.tasks
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if feature:
        tasks = [t for t in tasks if t.get("feature") == feature]
    return {"tasks": tasks, "total": len(tasks)}

def tool_update_task(task_id: str, status: str = None, assignee: str = None):
    for task in state.tasks:
        if task["id"] == task_id:
            if status:
                task["status"] = status
                if status == "completed":
                    task["completed_at"] = datetime.now().isoformat()
            if assignee:
                task["assignee"] = assignee
            task["updated_at"] = datetime.now().isoformat()
            save_state()
            return {"success": True, "task": task}
    return {"success": False, "error": "Task not found"}

# ─────────────────────────────────────────────────────────────────────────────
# Task Locking (Conflict Prevention)
# ─────────────────────────────────────────────────────────────────────────────

def tool_claim_task(task_id: str, agent_role: str):
    load_state()
    cleanup_expired_locks()

    if task_id in state.task_locks:
        existing = state.task_locks[task_id]
        return {
            "success": False,
            "error": f"Task already claimed by {existing['agent_role']}",
            "lock": existing
        }

    now = datetime.now()
    expires = now + timedelta(minutes=TASK_LOCK_TIMEOUT_MINUTES)
    lock = TaskLock(
        task_id=task_id,
        agent_role=agent_role,
        claimed_at=now.isoformat(),
        expires_at=expires.isoformat()
    )
    state.task_locks[task_id] = asdict(lock)
    save_state()
    return {"success": True, "lock": asdict(lock)}

def tool_release_task(task_id: str, agent_role: str):
    load_state()
    if task_id not in state.task_locks:
        return {"success": False, "error": "Task is not locked"}

    lock = state.task_locks[task_id]
    if lock["agent_role"] != agent_role:
        return {"success": False, "error": f"Task is locked by {lock['agent_role']}, not {agent_role}"}

    del state.task_locks[task_id]
    save_state()
    return {"success": True, "message": f"Task {task_id} released"}

def tool_get_task_lock(task_id: str):
    load_state()
    cleanup_expired_locks()
    if task_id in state.task_locks:
        return {"locked": True, "lock": state.task_locks[task_id]}
    return {"locked": False}

def tool_get_all_locks():
    load_state()
    cleanup_expired_locks()
    return {"locks": state.task_locks, "count": len(state.task_locks)}

def tool_force_unlock(task_id: str):
    load_state()
    if task_id in state.task_locks:
        del state.task_locks[task_id]
        save_state()
        return {"success": True, "message": f"Task {task_id} force unlocked"}
    return {"success": False, "error": "Task is not locked"}

def cleanup_expired_locks():
    now = datetime.now()
    expired = []
    for task_id, lock in state.task_locks.items():
        if datetime.fromisoformat(lock["expires_at"]) < now:
            expired.append(task_id)
    for task_id in expired:
        del state.task_locks[task_id]
    if expired:
        save_state()

# ─────────────────────────────────────────────────────────────────────────────
# Feature Management
# ─────────────────────────────────────────────────────────────────────────────

def tool_list_features(enabled_only: bool = False):
    all_features = [
        "payments", "appointments", "inventory", "crm", "cms",
        "ecommerce", "analytics", "notifications", "audit", "export", "realtime"
    ]
    load_state()
    if enabled_only:
        return {"features": state.enabled_features}
    return {
        "all_features": all_features,
        "enabled": state.enabled_features,
        "disabled": [f for f in all_features if f not in state.enabled_features]
    }

def tool_enable_feature(feature_id: str):
    load_state()
    if feature_id not in state.enabled_features:
        state.enabled_features.append(feature_id)
        save_state()
    return {"success": True, "enabled_features": state.enabled_features}

def tool_disable_feature(feature_id: str):
    load_state()
    if feature_id in state.enabled_features:
        state.enabled_features.remove(feature_id)
        save_state()
    return {"success": True, "enabled_features": state.enabled_features}

# ─────────────────────────────────────────────────────────────────────────────
# Context Efficiency Tools
# ─────────────────────────────────────────────────────────────────────────────

BIBLE_ROLE_MAPPING = {
    "lead": ["00-master", "01-vision", "99-tracking"],
    "architect": ["00-master", "03-data", "05-api", "07-tech"],
    "backend": ["03-data", "05-api"],
    "frontend": ["06-ui"],
    "data": ["03-data"],
    "qa": ["99-tracking"],
    "devops": ["07-tech"]
}

def tool_get_project_summary():
    load_state()
    return {
        "name": state.name,
        "code": state.code,
        "phase": state.phase,
        "features": state.enabled_features,
        "pending_tasks": len([t for t in state.tasks if t["status"] == "pending"]),
        "in_progress_tasks": len([t for t in state.tasks if t["status"] == "in_progress"])
    }

def tool_get_bible_sections_for_role(role: str):
    sections = BIBLE_ROLE_MAPPING.get(role, [])
    return {"role": role, "sections": sections}

def tool_get_bible_section(section: str):
    bible_path = Path(os.getcwd()) / "docs" / "bible" / section
    if not bible_path.exists():
        return {"error": f"Section {section} not found"}

    content = {}
    for file in bible_path.glob("*.md"):
        with open(file, "r") as f:
            content[file.name] = f.read()
    return {"section": section, "files": content}

def tool_get_task_context(task_id: str):
    load_state()
    for task in state.tasks:
        if task["id"] == task_id:
            context = {
                "task": task,
                "related_feature": task.get("feature"),
                "phase": state.phase
            }
            if task.get("feature"):
                context["feature_bible"] = f"04-features/{task['feature']}.md"
            return context
    return {"error": "Task not found"}

# ─────────────────────────────────────────────────────────────────────────────
# Decision Tracking
# ─────────────────────────────────────────────────────────────────────────────

def tool_add_decision(id: str, title: str, description: str, rationale: str):
    decision = {
        "id": id,
        "title": title,
        "description": description,
        "rationale": rationale,
        "created_at": datetime.now().isoformat()
    }
    state.decisions.append(decision)
    save_state()
    return {"success": True, "decision": decision}

def tool_get_decisions():
    load_state()
    return {"decisions": state.decisions}

# ─────────────────────────────────────────────────────────────────────────────
# Activity Logging
# ─────────────────────────────────────────────────────────────────────────────

def tool_log_activity(agent: str, action: str, details: str = ""):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": agent,
        "action": action,
        "details": details
    }
    state.activity_log.append(entry)
    save_state()
    return {"success": True}

# ─────────────────────────────────────────────────────────────────────────────
# Bible Status
# ─────────────────────────────────────────────────────────────────────────────

def tool_get_bible_status():
    bible_path = Path(os.getcwd()) / "docs" / "bible"
    if not bible_path.exists():
        return {"error": "Bible directory not found"}

    status = {}
    for section in bible_path.iterdir():
        if section.is_dir() and not section.name.startswith("_"):
            files = list(section.glob("*.md"))
            status[section.name] = {
                "file_count": len(files),
                "files": [f.name for f in files]
            }
    return {"bible_status": status}

# ─────────────────────────────────────────────────────────────────────────────
# Tool Registry
# ─────────────────────────────────────────────────────────────────────────────

TOOLS = {
    "init_project": {
        "description": "Initialize a new project",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Project name"},
                "code": {"type": "string", "description": "Project code (uppercase)"},
                "features": {"type": "array", "items": {"type": "string"}, "description": "Enabled features"}
            },
            "required": ["name", "code", "features"]
        },
        "handler": tool_init_project
    },
    "get_status": {
        "description": "Get current project status",
        "parameters": {"type": "object", "properties": {}},
        "handler": tool_get_status
    },
    "set_phase": {
        "description": "Set current workflow phase",
        "parameters": {
            "type": "object",
            "properties": {
                "phase": {"type": "string", "description": "Phase name"}
            },
            "required": ["phase"]
        },
        "handler": tool_set_phase
    },
    "register_agent": {
        "description": "Register an agent role",
        "parameters": {
            "type": "object",
            "properties": {
                "role": {"type": "string", "description": "Agent role"}
            },
            "required": ["role"]
        },
        "handler": tool_register_agent
    },
    "create_task": {
        "description": "Create a new task",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "feature": {"type": "string"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]}
            },
            "required": ["title"]
        },
        "handler": tool_create_task
    },
    "get_tasks": {
        "description": "Get tasks with optional filters",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "feature": {"type": "string"}
            }
        },
        "handler": tool_get_tasks
    },
    "update_task": {
        "description": "Update a task",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "status": {"type": "string"},
                "assignee": {"type": "string"}
            },
            "required": ["task_id"]
        },
        "handler": tool_update_task
    },
    "claim_task": {
        "description": "Claim a task (lock it for an agent)",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "agent_role": {"type": "string"}
            },
            "required": ["task_id", "agent_role"]
        },
        "handler": tool_claim_task
    },
    "release_task": {
        "description": "Release a task lock",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "agent_role": {"type": "string"}
            },
            "required": ["task_id", "agent_role"]
        },
        "handler": tool_release_task
    },
    "get_task_lock": {
        "description": "Check if a task is locked",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"}
            },
            "required": ["task_id"]
        },
        "handler": tool_get_task_lock
    },
    "get_all_locks": {
        "description": "Get all active task locks",
        "parameters": {"type": "object", "properties": {}},
        "handler": tool_get_all_locks
    },
    "force_unlock": {
        "description": "Force unlock a task (lead only)",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"}
            },
            "required": ["task_id"]
        },
        "handler": tool_force_unlock
    },
    "list_features": {
        "description": "List all features",
        "parameters": {
            "type": "object",
            "properties": {
                "enabled_only": {"type": "boolean"}
            }
        },
        "handler": tool_list_features
    },
    "enable_feature": {
        "description": "Enable a feature",
        "parameters": {
            "type": "object",
            "properties": {
                "feature_id": {"type": "string"}
            },
            "required": ["feature_id"]
        },
        "handler": tool_enable_feature
    },
    "disable_feature": {
        "description": "Disable a feature",
        "parameters": {
            "type": "object",
            "properties": {
                "feature_id": {"type": "string"}
            },
            "required": ["feature_id"]
        },
        "handler": tool_disable_feature
    },
    "get_project_summary": {
        "description": "Get a concise project summary (token efficient)",
        "parameters": {"type": "object", "properties": {}},
        "handler": tool_get_project_summary
    },
    "get_bible_sections_for_role": {
        "description": "Get Bible sections relevant to a role",
        "parameters": {
            "type": "object",
            "properties": {
                "role": {"type": "string"}
            },
            "required": ["role"]
        },
        "handler": tool_get_bible_sections_for_role
    },
    "get_bible_section": {
        "description": "Get content from a Bible section",
        "parameters": {
            "type": "object",
            "properties": {
                "section": {"type": "string"}
            },
            "required": ["section"]
        },
        "handler": tool_get_bible_section
    },
    "get_task_context": {
        "description": "Get context for a specific task",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"}
            },
            "required": ["task_id"]
        },
        "handler": tool_get_task_context
    },
    "add_decision": {
        "description": "Add a project decision",
        "parameters": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "rationale": {"type": "string"}
            },
            "required": ["id", "title", "description", "rationale"]
        },
        "handler": tool_add_decision
    },
    "get_decisions": {
        "description": "Get all project decisions",
        "parameters": {"type": "object", "properties": {}},
        "handler": tool_get_decisions
    },
    "log_activity": {
        "description": "Log an agent activity",
        "parameters": {
            "type": "object",
            "properties": {
                "agent": {"type": "string"},
                "action": {"type": "string"},
                "details": {"type": "string"}
            },
            "required": ["agent", "action"]
        },
        "handler": tool_log_activity
    },
    "get_bible_status": {
        "description": "Get Bible documentation status",
        "parameters": {"type": "object", "properties": {}},
        "handler": tool_get_bible_status
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Loop
# ─────────────────────────────────────────────────────────────────────────────

def main():
    load_state()

    for line in sys.stdin:
        try:
            request = json.loads(line)
            method = request.get("method")
            id = request.get("id")
            params = request.get("params", {})

            if method == "initialize":
                send_response(id, {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "nyoworks-mcp", "version": "2.0.0"}
                })
            elif method == "tools/list":
                tools_list = [
                    {"name": name, "description": tool["description"], "inputSchema": tool["parameters"]}
                    for name, tool in TOOLS.items()
                ]
                send_response(id, {"tools": tools_list})
            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})

                if tool_name in TOOLS:
                    result = TOOLS[tool_name]["handler"](**tool_args)
                    send_response(id, {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]})
                else:
                    send_error(id, -32601, f"Unknown tool: {tool_name}")
            elif method == "notifications/initialized":
                pass
            else:
                send_error(id, -32601, f"Unknown method: {method}")
        except Exception as e:
            send_error(request.get("id"), -32603, str(e))

if __name__ == "__main__":
    main()
