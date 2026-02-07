// ═══════════════════════════════════════════════════════════════════════════════
// Login Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native"
import { Link, router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      console.log("Login:", { email, password })
      router.replace("/(tabs)/home")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-6 justify-center">
        <View className="space-y-6">
          <View className="space-y-2">
            <Text className="text-2xl font-bold text-foreground text-center">
              Welcome back
            </Text>
            <Text className="text-muted-foreground text-center">
              Enter your credentials to sign in
            </Text>
          </View>

          <View className="space-y-4">
            <View className="space-y-2">
              <Text className="text-sm font-medium text-foreground">Email</Text>
              <TextInput
                className="h-12 border border-muted rounded-lg px-4 text-foreground"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="space-y-2">
              <Text className="text-sm font-medium text-foreground">Password</Text>
              <TextInput
                className="h-12 border border-muted rounded-lg px-4 text-foreground"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              className="h-12 bg-primary rounded-lg items-center justify-center"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-secondary font-semibold">Sign in</Text>
              )}
            </Pressable>
          </View>

          <Text className="text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/(auth)/register" className="text-primary">
              Register
            </Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
