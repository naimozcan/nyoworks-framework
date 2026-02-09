// ═══════════════════════════════════════════════════════════════════════════════
// Explore Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { View, Text, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Explore
            </Text>
            <Text className="text-muted-foreground">
              Discover new features
            </Text>
          </View>

          <View className="bg-white border border-muted rounded-xl p-6">
            <Text className="text-lg font-semibold text-foreground">
              Getting Started
            </Text>
            <Text className="text-muted-foreground mt-2">
              Start exploring the features of your application.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
