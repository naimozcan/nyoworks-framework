// ═══════════════════════════════════════════════════════════════════════════════
// Mobile Platform Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileConfig {
  framework: "expo"
  version: "54"
  features: {
    expoRouter: boolean
    nativeWind: boolean
    pushNotifications: boolean
  }
  targets: {
    ios: boolean
    android: boolean
  }
}

export const mobileConfig: MobileConfig = {
  framework: "expo",
  version: "54",
  features: {
    expoRouter: true,
    nativeWind: true,
    pushNotifications: true,
  },
  targets: {
    ios: true,
    android: true,
  },
}
