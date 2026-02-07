// ═══════════════════════════════════════════════════════════════════════════════
// Home Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { View, Text, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Welcome
            </Text>
            <Text className="text-muted-foreground">
              Your dashboard overview
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[140px] bg-white border border-muted rounded-xl p-4">
              <Text className="text-sm text-muted-foreground">Total Users</Text>
              <Text className="text-2xl font-bold text-foreground">1,234</Text>
            </View>

            <View className="flex-1 min-w-[140px] bg-white border border-muted rounded-xl p-4">
              <Text className="text-sm text-muted-foreground">Active</Text>
              <Text className="text-2xl font-bold text-foreground">567</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[140px] bg-white border border-muted rounded-xl p-4">
              <Text className="text-sm text-muted-foreground">Revenue</Text>
              <Text className="text-2xl font-bold text-foreground">$12,345</Text>
            </View>

            <View className="flex-1 min-w-[140px] bg-white border border-muted rounded-xl p-4">
              <Text className="text-sm text-muted-foreground">Growth</Text>
              <Text className="text-2xl font-bold text-foreground">+23%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
