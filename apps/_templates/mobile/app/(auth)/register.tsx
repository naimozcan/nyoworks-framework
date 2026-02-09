// ═══════════════════════════════════════════════════════════════════════════════
// Register Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native"
import { Link, router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    try {
      console.log("Register:", { name, email, password })
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
              Create an account
            </Text>
            <Text className="text-muted-foreground text-center">
              Enter your details to get started
            </Text>
          </View>

          <View className="space-y-4">
            <View className="space-y-2">
              <Text className="text-sm font-medium text-foreground">Name</Text>
              <TextInput
                className="h-12 border border-muted rounded-lg px-4 text-foreground"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
              />
            </View>

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
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              className="h-12 bg-primary rounded-lg items-center justify-center"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-secondary font-semibold">Create account</Text>
              )}
            </Pressable>
          </View>

          <Text className="text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/(auth)/login" className="text-primary">
              Sign in
            </Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
