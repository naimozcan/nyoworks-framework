#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════════
# NYOWORKS CLI - Project Management
# ═══════════════════════════════════════════════════════════════════════════════

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

AVAILABLE_FEATURES = [
    "payments", "appointments", "inventory", "crm", "cms",
    "ecommerce", "analytics", "notifications", "audit", "export", "realtime"
]

WORKFLOW_PHASES = [
    "DISCOVERY", "ARCHITECTURE", "PLANNING", "BACKEND", "FRONTEND", "QA", "DEPLOYMENT"
]

# ─────────────────────────────────────────────────────────────────────────────
# State Management
# ─────────────────────────────────────────────────────────────────────────────

def get_state_file():
    return Path(os.getcwd()) / ".nyoworks" / "state.json"

def load_state():
    state_file = get_state_file()
    if state_file.exists():
        with open(state_file, "r") as f:
            return json.load(f)
    return None

def save_state(state):
    state_file = get_state_file()
    state_file.parent.mkdir(parents=True, exist_ok=True)
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)

def get_config_file():
    return Path(os.getcwd()) / "nyoworks.config.yaml"

# ─────────────────────────────────────────────────────────────────────────────
# Output Helpers
# ─────────────────────────────────────────────────────────────────────────────

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}\n")

def print_success(text):
    print(f"[OK] {text}")

def print_error(text):
    print(f"[ERROR] {text}", file=sys.stderr)

def print_info(text):
    print(f"[INFO] {text}")

def print_table(headers, rows):
    col_widths = [max(len(str(row[i])) for row in [headers] + rows) for i in range(len(headers))]

    header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    separator = "-+-".join("-" * w for w in col_widths)

    print(header_line)
    print(separator)
    for row in rows:
        print(" | ".join(str(col).ljust(col_widths[i]) for i, col in enumerate(row)))

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Status
# ─────────────────────────────────────────────────────────────────────────────

def cmd_status(args):
    state = load_state()
    if not state:
        print_error("No project found. Run 'nyoworks new' to create a project.")
        return 1

    print_header(f"Project: {state.get('name', 'Unknown')}")

    print(f"Code:     {state.get('code', 'N/A')}")
    print(f"Phase:    {state.get('phase', 'DISCOVERY')}")
    print(f"Features: {', '.join(state.get('enabled_features', [])) or 'None'}")
    print()

    tasks = state.get("tasks", [])
    pending = len([t for t in tasks if t["status"] == "pending"])
    in_progress = len([t for t in tasks if t["status"] == "in_progress"])
    completed = len([t for t in tasks if t["status"] == "completed"])

    print(f"Tasks:    {pending} pending, {in_progress} in progress, {completed} completed")
    print(f"Agents:   {', '.join(state.get('agents', {}).keys()) or 'None'}")
    print(f"Locks:    {len(state.get('task_locks', {}))}")

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Phase
# ─────────────────────────────────────────────────────────────────────────────

def cmd_phase(args):
    state = load_state()
    if not state:
        print_error("No project found.")
        return 1

    if args.set:
        if args.set not in WORKFLOW_PHASES:
            print_error(f"Invalid phase. Must be one of: {', '.join(WORKFLOW_PHASES)}")
            return 1
        state["phase"] = args.set
        save_state(state)
        print_success(f"Phase set to {args.set}")
    else:
        current = state.get("phase", "DISCOVERY")
        current_idx = WORKFLOW_PHASES.index(current) if current in WORKFLOW_PHASES else 0

        print_header("Workflow Phases")
        for i, phase in enumerate(WORKFLOW_PHASES):
            marker = ">>>" if i == current_idx else "   "
            status = "[CURRENT]" if i == current_idx else "[DONE]" if i < current_idx else ""
            print(f"{marker} {i+1}. {phase} {status}")

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Task
# ─────────────────────────────────────────────────────────────────────────────

def cmd_task(args):
    state = load_state()
    if not state:
        print_error("No project found.")
        return 1

    if args.task_command == "list":
        tasks = state.get("tasks", [])
        if args.status:
            tasks = [t for t in tasks if t["status"] == args.status]
        if args.feature:
            tasks = [t for t in tasks if t.get("feature") == args.feature]

        if not tasks:
            print_info("No tasks found.")
            return 0

        print_header("Tasks")
        rows = [[t["id"], t["title"][:40], t["status"], t.get("assignee", "-"), t.get("feature", "-")] for t in tasks]
        print_table(["ID", "Title", "Status", "Assignee", "Feature"], rows)

    elif args.task_command == "create":
        task_id = f"TASK-{len(state.get('tasks', [])) + 1:03d}"
        now = datetime.now().isoformat()
        task = {
            "id": task_id,
            "title": args.title,
            "description": args.description or "",
            "status": "pending",
            "assignee": None,
            "feature": args.feature,
            "priority": args.priority or "medium",
            "created_at": now,
            "updated_at": now,
            "completed_at": None
        }
        if "tasks" not in state:
            state["tasks"] = []
        state["tasks"].append(task)
        save_state(state)
        print_success(f"Created task {task_id}: {args.title}")

    elif args.task_command == "claim":
        task_locks = state.get("task_locks", {})
        if args.id in task_locks:
            print_error(f"Task already claimed by {task_locks[args.id]['agent_role']}")
            return 1

        from datetime import timedelta
        now = datetime.now()
        expires = now + timedelta(minutes=30)
        task_locks[args.id] = {
            "task_id": args.id,
            "agent_role": args.role or "manual",
            "claimed_at": now.isoformat(),
            "expires_at": expires.isoformat()
        }
        state["task_locks"] = task_locks
        save_state(state)
        print_success(f"Claimed task {args.id}")

    elif args.task_command == "release":
        task_locks = state.get("task_locks", {})
        if args.id not in task_locks:
            print_error(f"Task {args.id} is not locked")
            return 1
        del task_locks[args.id]
        state["task_locks"] = task_locks
        save_state(state)
        print_success(f"Released task {args.id}")

    elif args.task_command == "locks":
        locks = state.get("task_locks", {})
        if not locks:
            print_info("No active locks.")
            return 0

        print_header("Active Task Locks")
        rows = [[l["task_id"], l["agent_role"], l["claimed_at"][:19], l["expires_at"][:19]] for l in locks.values()]
        print_table(["Task", "Agent", "Claimed At", "Expires At"], rows)

    elif args.task_command == "unlock":
        task_locks = state.get("task_locks", {})
        if args.id in task_locks:
            del task_locks[args.id]
            state["task_locks"] = task_locks
            save_state(state)
            print_success(f"Force unlocked task {args.id}")
        else:
            print_error(f"Task {args.id} is not locked")
            return 1

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Feature
# ─────────────────────────────────────────────────────────────────────────────

def cmd_feature(args):
    state = load_state()
    if not state:
        print_error("No project found.")
        return 1

    if args.feature_command == "list":
        enabled = state.get("enabled_features", [])

        if args.enabled:
            print_header("Enabled Features")
            for f in enabled:
                print(f"  - {f}")
        else:
            print_header("All Features")
            rows = [[f, "Enabled" if f in enabled else "Disabled"] for f in AVAILABLE_FEATURES]
            print_table(["Feature", "Status"], rows)

    elif args.feature_command == "enable":
        if args.id not in AVAILABLE_FEATURES:
            print_error(f"Unknown feature: {args.id}")
            return 1

        enabled = state.get("enabled_features", [])
        if args.id not in enabled:
            enabled.append(args.id)
            state["enabled_features"] = enabled
            save_state(state)
        print_success(f"Feature '{args.id}' enabled")

    elif args.feature_command == "disable":
        enabled = state.get("enabled_features", [])
        if args.id in enabled:
            enabled.remove(args.id)
            state["enabled_features"] = enabled
            save_state(state)
        print_success(f"Feature '{args.id}' disabled")

    elif args.feature_command == "info":
        manifest_path = Path(__file__).parent.parent / "features" / args.id / "manifest.yaml"
        if not manifest_path.exists():
            print_error(f"Feature '{args.id}' not found")
            return 1

        print_header(f"Feature: {args.id}")
        with open(manifest_path, "r") as f:
            print(f.read())

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Bible
# ─────────────────────────────────────────────────────────────────────────────

def cmd_bible(args):
    bible_path = Path(os.getcwd()) / "docs" / "bible"

    if not bible_path.exists():
        print_error("Bible directory not found.")
        return 1

    if args.bible_command == "status":
        print_header("Bible Documentation Status")

        for section in sorted(bible_path.iterdir()):
            if section.is_dir() and not section.name.startswith("_"):
                files = list(section.glob("*.md"))
                filled = len([f for f in files if f.stat().st_size > 100])
                print(f"  {section.name}: {filled}/{len(files)} files")

    elif args.bible_command == "check":
        print_header("Bible Consistency Check")

        issues = []
        required_sections = ["00-master", "01-vision", "02-actors", "03-data", "05-api", "06-ui", "07-tech"]

        for section in required_sections:
            section_path = bible_path / section
            if not section_path.exists():
                issues.append(f"Missing section: {section}")

        if issues:
            for issue in issues:
                print(f"  [WARN] {issue}")
        else:
            print_success("All required sections present")

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Commands: Decision
# ─────────────────────────────────────────────────────────────────────────────

def cmd_decision(args):
    state = load_state()
    if not state:
        print_error("No project found.")
        return 1

    if args.decision_command == "list":
        decisions = state.get("decisions", [])
        if not decisions:
            print_info("No decisions recorded.")
            return 0

        print_header("Project Decisions")
        for d in decisions:
            print(f"\n[{d['id']}] {d['title']}")
            print(f"  {d['description']}")
            print(f"  Rationale: {d['rationale']}")

    elif args.decision_command == "add":
        decision = {
            "id": args.id,
            "title": args.title,
            "description": args.description,
            "rationale": args.rationale,
            "created_at": datetime.now().isoformat()
        }
        if "decisions" not in state:
            state["decisions"] = []
        state["decisions"].append(decision)
        save_state(state)
        print_success(f"Added decision {args.id}")

    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="nyoworks",
        description="NYOWORKS Framework CLI"
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Status command
    status_parser = subparsers.add_parser("status", help="Show project status")
    status_parser.set_defaults(func=cmd_status)

    # Phase command
    phase_parser = subparsers.add_parser("phase", help="Manage workflow phase")
    phase_parser.add_argument("--set", help="Set phase")
    phase_parser.set_defaults(func=cmd_phase)

    # Task command
    task_parser = subparsers.add_parser("task", help="Manage tasks")
    task_subparsers = task_parser.add_subparsers(dest="task_command")

    task_list = task_subparsers.add_parser("list", help="List tasks")
    task_list.add_argument("--status", help="Filter by status")
    task_list.add_argument("--feature", help="Filter by feature")

    task_create = task_subparsers.add_parser("create", help="Create task")
    task_create.add_argument("title", help="Task title")
    task_create.add_argument("--description", help="Task description")
    task_create.add_argument("--feature", help="Associated feature")
    task_create.add_argument("--priority", help="Priority level")

    task_claim = task_subparsers.add_parser("claim", help="Claim a task")
    task_claim.add_argument("id", help="Task ID")
    task_claim.add_argument("--role", help="Agent role")

    task_release = task_subparsers.add_parser("release", help="Release a task")
    task_release.add_argument("id", help="Task ID")

    task_locks = task_subparsers.add_parser("locks", help="Show active locks")

    task_unlock = task_subparsers.add_parser("unlock", help="Force unlock a task")
    task_unlock.add_argument("id", help="Task ID")

    task_parser.set_defaults(func=cmd_task)

    # Feature command
    feature_parser = subparsers.add_parser("feature", help="Manage features")
    feature_subparsers = feature_parser.add_subparsers(dest="feature_command")

    feature_list = feature_subparsers.add_parser("list", help="List features")
    feature_list.add_argument("--enabled", action="store_true", help="Show only enabled")

    feature_enable = feature_subparsers.add_parser("enable", help="Enable feature")
    feature_enable.add_argument("id", help="Feature ID")

    feature_disable = feature_subparsers.add_parser("disable", help="Disable feature")
    feature_disable.add_argument("id", help="Feature ID")

    feature_info = feature_subparsers.add_parser("info", help="Show feature info")
    feature_info.add_argument("id", help="Feature ID")

    feature_parser.set_defaults(func=cmd_feature)

    # Bible command
    bible_parser = subparsers.add_parser("bible", help="Bible documentation")
    bible_subparsers = bible_parser.add_subparsers(dest="bible_command")

    bible_subparsers.add_parser("status", help="Show Bible status")
    bible_subparsers.add_parser("check", help="Check Bible consistency")

    bible_parser.set_defaults(func=cmd_bible)

    # Decision command
    decision_parser = subparsers.add_parser("decision", help="Manage decisions")
    decision_subparsers = decision_parser.add_subparsers(dest="decision_command")

    decision_subparsers.add_parser("list", help="List decisions")

    decision_add = decision_subparsers.add_parser("add", help="Add decision")
    decision_add.add_argument("id", help="Decision ID")
    decision_add.add_argument("title", help="Decision title")
    decision_add.add_argument("description", help="Description")
    decision_add.add_argument("rationale", help="Rationale")

    decision_parser.set_defaults(func=cmd_decision)

    args = parser.parse_args()

    if hasattr(args, "func"):
        sys.exit(args.func(args))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
