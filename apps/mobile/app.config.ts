// ═══════════════════════════════════════════════════════════════════════════════
// Expo App Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import type { ExpoConfig } from "expo/config"

const config: ExpoConfig = {
  name: "NYOWORKS",
  slug: "nyoworks",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "nyoworks",
  userInterfaceStyle: "automatic",

  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ffffff",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.nyoworks.app",
    usesNonExemptEncryption: false,
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.nyoworks.app",
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },

  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  },
}

export default config
