// ═══════════════════════════════════════════════════════════════════════════════
// Desktop App Factory
// ═══════════════════════════════════════════════════════════════════════════════

import { desktopConfig, type DesktopConfig } from "./config"

export interface DesktopAppOptions {
  appId: string
  name: string
  features: string[]
  integrations: string[]
  locale: string
}

export interface DesktopAppResult {
  config: DesktopConfig
  paths: {
    src: string
    "src-tauri": string
  }
  scripts: {
    dev: string
    build: string
    "build:windows": string
    "build:macos": string
    "build:linux": string
  }
}

export function createDesktopApp(options: DesktopAppOptions): DesktopAppResult {
  return {
    config: desktopConfig,
    paths: {
      src: `apps/${options.appId}/desktop/src`,
      "src-tauri": `apps/${options.appId}/desktop/src-tauri`,
    },
    scripts: {
      dev: "tauri dev",
      build: "tauri build",
      "build:windows": "tauri build --target x86_64-pc-windows-msvc",
      "build:macos": "tauri build --target universal-apple-darwin",
      "build:linux": "tauri build --target x86_64-unknown-linux-gnu",
    },
  }
}
