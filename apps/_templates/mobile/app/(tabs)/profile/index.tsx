// ═══════════════════════════════════════════════════════════════════════════════
// Profile Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { View, Text, Pressable, ScrollView } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { User, Settings, LogOut, ChevronRight } from "lucide-react-native"

// ─────────────────────────────────────────────────────────────────────────────
// Menu Items
// ─────────────────────────────────────────────────────────────────────────────

const menuItems = [
  { icon: User, label: "Edit Profile", action: () => {} },
  { icon: Settings, label: "Settings", action: () => {} },
  { icon: LogOut, label: "Logout", action: () => router.replace("/") },
]

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          <View className="items-center space-y-4">
            <View className="w-24 h-24 bg-muted rounded-full items-center justify-center">
              <User size={40} color="#71717a" />
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-foreground">
                John Doe
              </Text>
              <Text className="text-muted-foreground">
                john@example.com
              </Text>
            </View>
          </View>

          <View className="bg-white border border-muted rounded-xl overflow-hidden">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Pressable
                  key={item.label}
                  className={`flex-row items-center justify-between p-4 ${
                    index !== menuItems.length - 1 ? "border-b border-muted" : ""
                  }`}
                  onPress={item.action}
                >
                  <View className="flex-row items-center gap-3">
                    <Icon size={20} color="#71717a" />
                    <Text className="text-foreground">{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color="#71717a" />
                </Pressable>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
