import AsyncStorage from "@react-native-async-storage/async-storage"
import { colorScheme, useColorScheme } from "nativewind"
import { useEffect } from "react"
import { Platform } from "react-native"

type Theme = "light" | "dark"

const STORAGE_KEY = "theme"

/** Set once the user picks a theme, so OS changes stop overriding it. */
let hasUserChoice = false

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

/**
 * Applies the saved theme on startup; without one, the app follows the OS.
 * Native gets OS changes from Nativewind; on web the `dark` class must be set
 * explicitly, so this also mirrors `prefers-color-scheme` there.
 */
export function useThemePreference() {
  useEffect(() => {
    let cancelled = false
    const media =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.matchMedia?.("(prefers-color-scheme: dark)")
        : undefined

    if (media?.matches) colorScheme.set("dark")

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (cancelled || !isTheme(saved)) return
        hasUserChoice = true
        colorScheme.set(saved)
      })
      .catch(() => {
        // Storage unavailable (e.g. private browsing): keep following the OS.
      })

    function onMediaChange(event: MediaQueryListEvent) {
      if (!hasUserChoice) colorScheme.set(event.matches ? "dark" : "light")
    }
    media?.addEventListener("change", onMediaChange)

    return () => {
      cancelled = true
      media?.removeEventListener("change", onMediaChange)
    }
  }, [])
}

/** Current theme plus a toggle that saves the choice. */
export function useThemeToggle(): [Theme, () => void] {
  const { colorScheme: current } = useColorScheme()
  const theme: Theme = current === "dark" ? "dark" : "light"

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    hasUserChoice = true
    colorScheme.set(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }

  return [theme, toggle]
}
