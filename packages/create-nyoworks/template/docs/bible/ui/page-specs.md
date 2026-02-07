# Page Specifications Guide

## Purpose

Page specs define WHAT a page does, not HOW it looks. Visual details come from theme tokens and shadcn defaults.

## Spec Format

```markdown
## [Page Name]
- Route: /path
- Auth: required | optional | none
- Layout: app | auth | marketing | standalone
- Sections: [ordered list of page sections]
- Key interactions: [user actions and their outcomes]
- Data: [API endpoints consumed, query params]
- Bible refs: [P-xxx, T-xxx decisions that apply]
- i18n keys: [namespace for translations]
```

## Rules

1. Keep specs 10-20 lines maximum (Martin Fowler: "minimum viable spec")
2. Describe BEHAVIOR, not APPEARANCE
3. NO pixel values, NO color codes, NO font sizes
4. Theme tokens and shadcn defaults handle visual details
5. Reference Bible decisions for business logic
6. Specify auth level and layout for routing
7. List data dependencies (API endpoints)

## MCP Integration

Create spec: `mcp__nyoworks__create_spec({taskId, type: "page", title, content, bibleRefs})`
Get spec: `mcp__nyoworks__get_spec({taskId})`

## Sub-Phase

Page specs are created during FRONTEND.CONTRACT sub-phase by designer.
Implementation happens during FRONTEND.PAGES sub-phase by frontend developer.
