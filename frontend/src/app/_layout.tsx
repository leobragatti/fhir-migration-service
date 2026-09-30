import "../../global.css"

import { PortalHost } from "@rn-primitives/portal"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { ThemeProvider } from "expo-router/react-navigation"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "nativewind"

import { ThemeToggle } from "@/components/theme-toggle"
import { useThemePreference } from "@/hooks/use-theme-preference"
import { NAV_THEME } from "@/lib/theme"

export { ErrorBoundary } from "expo-router"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function RootLayout() {
  useThemePreference()
  const { colorScheme } = useColorScheme()
  const scheme = colorScheme === "dark" ? "dark" : "light"

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME[scheme]}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerRight: () => <ThemeToggle /> }}>
          <Stack.Screen name="index" options={{ title: "FHIR Migration" }} />
          <Stack.Screen name="patients/[id]" options={{ title: "Patient" }} />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
