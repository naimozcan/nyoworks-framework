// ═══════════════════════════════════════════════════════════════════════════════
// Web App Factory
// ═══════════════════════════════════════════════════════════════════════════════

import { webConfig, type WebConfig } from "./config"

export interface WebAppOptions {
  appId: string
  name: string
  features: string[]
  integrations: string[]
  locale: string
}

export interface WebAppResult {
  config: WebConfig
  paths: {
    app: string
    api: string
    public: string
  }
  scripts: {
    dev: string
    build: string
    start: string
  }
}

export function createWebApp(options: WebAppOptions): WebAppResult {
  return {
    config: webConfig,
    paths: {
      app: `apps/${options.appId}/web/app`,
      api: `apps/${options.appId}/web/app/api`,
      public: `apps/${options.appId}/web/public`,
    },
    scripts: {
      dev: "next dev --turbopack",
      build: "next build",
      start: "next start",
    },
  }
}
