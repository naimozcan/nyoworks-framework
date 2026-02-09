// ═══════════════════════════════════════════════════════════════════════════════
// Tailwind CSS Configuration (NativeWind v4)
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        secondary: "#ffffff",
        background: "#ffffff",
        foreground: "#000000",
        muted: "#f4f4f5",
        "muted-foreground": "#71717a",
        destructive: "#ef4444",
      },
    },
  },
  plugins: [],
}
