# Spec-Driven Development

## What is SDD?

Spec-Driven Development ensures every task has a clear, concise specification
before implementation begins. Based on research from:

- Addy Osmani "Beyond Vibe Coding" (O'Reilly, 2026): spec-first + small chunks + CI guardrail = 40% fewer bugs
- Martin Fowler SDD Analysis (2025): specs should be SHORT, just enough to remove ambiguity
- arXiv paper (Jan 2026): 5-line spec outperforms 50-line spec because AI breaks things trying to follow over-specified instructions

## Spec Types

| Type | Used By | Description |
|------|---------|-------------|
| api | backend | API endpoint: method, path, input, output, auth, errors |
| page | frontend, designer | Page: route, layout, sections, interactions, data |
| component | frontend, designer | Component: props, states, accessibility |
| service | backend | Service: methods, dependencies, business rules |
| schema | data, architect | Schema: tables, relations, indexes, constraints |
| test | qa | Test plan: scenarios, coverage targets, edge cases |

## Spec Workflow

```
1. Agent checks: get_spec(taskId)
2. If missing: create_spec({taskId, type, title, content, bibleRefs})
3. Lead/architect reviews and approves: approve_spec({specId, approvedBy})
4. Agent implements according to spec
5. If spec changes needed: create new spec version
```

## Spec Rules

1. 10-20 lines maximum
2. Focus on WHAT, not HOW
3. Reference Bible decisions (P-xxx, T-xxx)
4. No implementation details (no code snippets in specs)
5. No visual details (colors, fonts, sizes) - theme handles those
6. Include auth requirements and error scenarios
7. List data dependencies (API endpoints, DB queries)

## MCP Tools

- `create_spec({taskId, type, title, content, bibleRefs})` - create a spec
- `get_spec({taskId})` - get spec for a task
- `approve_spec({specId, approvedBy})` - approve (lead/architect only)
- `require_spec({enabled})` - toggle spec requirement (lead only)

## Spec Requirement

When `specRequired` is enabled (via `require_spec({enabled: true})`):
- `validate_work_authorization` will REJECT work if task has no approved spec
- This ensures no implementation happens without a reviewed specification
- Default: disabled (for backward compatibility with existing projects)
