// ═══════════════════════════════════════════════════════════════════════════════
// Welcome Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { View, Text, Pressable } from "react-native"
import { Link } from "expo-router"

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <View className="items-center space-y-6">
        <Text className="text-4xl font-bold text-foreground">
          NYOWORKS
        </Text>
        <Text className="text-lg text-muted-foreground text-center">
          Your project is ready. Start building your application.
        </Text>

        <View className="flex-row gap-4 mt-8">
          <Link href="/(auth)/login" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-lg">
              <Text className="text-secondary font-semibold">Login</Text>
            </Pressable>
          </Link>

          <Link href="/(auth)/register" asChild>
            <Pressable className="border border-primary px-6 py-3 rounded-lg">
              <Text className="text-primary font-semibold">Register</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  )
}
