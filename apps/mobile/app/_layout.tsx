// ═══════════════════════════════════════════════════════════════════════════════
// Root Layout
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { initializeApi } from "@nyoworks/api-client/vanilla"
import "@/styles/global.css"

// ─────────────────────────────────────────────────────────────────────────────
// Prevent auto-hide splash screen
// ─────────────────────────────────────────────────────────────────────────────

SplashScreen.preventAutoHideAsync()

// ─────────────────────────────────────────────────────────────────────────────
// Query Client
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout() {
  useEffect(() => {
    initializeApi({
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
    })

    SplashScreen.hideAsync()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
