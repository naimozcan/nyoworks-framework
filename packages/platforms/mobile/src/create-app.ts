// ═══════════════════════════════════════════════════════════════════════════════
// Mobile App Factory
// ═══════════════════════════════════════════════════════════════════════════════

import { mobileConfig, type MobileConfig } from "./config"

export interface MobileAppOptions {
  appId: string
  name: string
  features: string[]
  integrations: string[]
  locale: string
}

export interface MobileAppResult {
  config: MobileConfig
  paths: {
    app: string
    assets: string
  }
  scripts: {
    dev: string
    build: string
    "build:ios": string
    "build:android": string
  }
}

export function createMobileApp(options: MobileAppOptions): MobileAppResult {
  return {
    config: mobileConfig,
    paths: {
      app: `apps/${options.appId}/mobile/app`,
      assets: `apps/${options.appId}/mobile/assets`,
    },
    scripts: {
      dev: "expo start",
      build: "eas build",
      "build:ios": "eas build --platform ios",
      "build:android": "eas build --platform android",
    },
  }
}
