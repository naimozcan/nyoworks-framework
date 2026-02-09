// ═══════════════════════════════════════════════════════════════════════════════
// Desktop Platform Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface DesktopConfig {
  framework: "tauri"
  version: "2.0"
  features: {
    autoUpdater: boolean
    systemTray: boolean
    deepLinks: boolean
  }
  targets: {
    windows: boolean
    macos: boolean
    linux: boolean
  }
}

export const desktopConfig: DesktopConfig = {
  framework: "tauri",
  version: "2.0",
  features: {
    autoUpdater: true,
    systemTray: true,
    deepLinks: true,
  },
  targets: {
    windows: true,
    macos: true,
    linux: true,
  },
}
