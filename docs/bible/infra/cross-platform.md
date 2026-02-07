# Cross-Platform Architecture

## Supported Platforms

Configured in nyoworks.config.yaml `platforms.targets`:
- web (default, always enabled)
- mobile (Expo SDK 54, React Native 0.81)
- desktop (Tauri 2.0)

## Shared Package Strategy

All shared code lives in packages/:

```
packages/
  shared/
    src/
      types/        # TypeScript interfaces and types
      api/          # API client (fetch-based, platform-agnostic)
      hooks/        # Business logic hooks (NOT UI hooks)
      constants/    # App-wide constants
      utils/        # Utility functions
  validators/
    src/            # Zod schemas (shared frontend + backend validation)
  database/
    src/            # Drizzle schema + migrations (backend only)
```

## Platform-Specific Code

| Concern | Web | Mobile | Desktop |
|---------|-----|--------|---------|
| App | apps/web/ | apps/mobile/ | apps/desktop/ |
| Framework | Next.js 16 | Expo SDK 54 | Tauri 2.0 + React |
| Navigation | App Router | Expo Router v6 | React Router |
| Styling | Tailwind CSS v4 | NativeWind v4 | Tailwind CSS v4 |
| Components | shadcn/ui | Custom RN | Shared with web |
| UI Hooks | apps/web/hooks/ | apps/mobile/hooks/ | apps/desktop/hooks/ |

## Rules

1. Business logic hooks go in packages/shared/src/hooks/
2. UI-specific hooks stay in app packages
3. Types and validators are ALWAYS shared
4. API client is shared, platform-specific adapters if needed
5. State management (TanStack Query) configuration is shared
6. Navigation is ALWAYS platform-specific
7. Styling is platform-specific (Tailwind vs NativeWind)
8. Never import from apps/* in packages/*

## MCP Tool

```
mcp__nyoworks__get_shared_architecture()
```
