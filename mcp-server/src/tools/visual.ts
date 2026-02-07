// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Visual Guidance & Cross-Platform Tools
// ═══════════════════════════════════════════════════════════════════════════════

import type { ToolHandler, ToolDefinition } from "../types.js"
import { VISUAL_GUIDANCE } from "../constants.js"
import { getState, loadState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  get_visual_guidance: ({ category }) => {
    if (category && VISUAL_GUIDANCE[category as string]) {
      return {
        category,
        libraries: VISUAL_GUIDANCE[category as string],
        rule: "NEVER write visual elements from scratch. ALWAYS use these libraries.",
      }
    }

    return {
      allCategories: Object.keys(VISUAL_GUIDANCE),
      rule: "NEVER write visual elements from scratch. ALWAYS use approved libraries.",
      guidance: VISUAL_GUIDANCE,
    }
  },

  get_shared_architecture: () => {
    loadState()
    const state = getState()

    const platforms = state.targetPlatforms || ["web"]

    return {
      platforms,
      sharedPackages: {
        types: "packages/shared/src/types/",
        validators: "packages/validators/src/",
        apiClient: "packages/shared/src/api/",
        hooks: "packages/shared/src/hooks/ (business logic only, no UI hooks)",
        constants: "packages/shared/src/constants/",
        utils: "packages/shared/src/utils/",
      },
      platformSpecific: {
        web: {
          app: "apps/web/",
          uiComponents: "packages/ui/ (shadcn-based, Tailwind)",
          navigation: "Next.js App Router",
          styling: "Tailwind CSS v4",
        },
        ...(platforms.includes("mobile") ? {
          mobile: {
            app: "apps/mobile/",
            uiComponents: "Platform-specific (NativeWind v4)",
            navigation: "Expo Router v6",
            styling: "NativeWind v4 (Tailwind for RN)",
          },
        } : {}),
        ...(platforms.includes("desktop") ? {
          desktop: {
            app: "apps/desktop/",
            uiComponents: "Shared with web (Tauri 2.0 + React)",
            navigation: "React Router or App Router",
            styling: "Same as web (Tailwind CSS v4)",
          },
        } : {}),
      },
      rules: [
        "Business logic hooks go in packages/shared/src/hooks/",
        "UI-specific hooks stay in app packages",
        "Types and validators are ALWAYS shared",
        "API client is shared, platform-specific adapters if needed",
        "State management (TanStack Query) is shared",
        "Navigation is ALWAYS platform-specific",
        "Styling is platform-specific (Tailwind vs NativeWind)",
      ],
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "get_visual_guidance",
    description: "Get approved library recommendations for visual elements. NEVER write charts, animations, icons from scratch - use these libraries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Optional category: charts, animations, effects, backgrounds, icons, loading, tables, lottie, forms" },
      },
    },
  },
  {
    name: "get_shared_architecture",
    description: "Get cross-platform architecture guide. Shows shared vs platform-specific package structure.",
    inputSchema: { type: "object" as const, properties: {} },
  },
]

export { handlers, definitions }
