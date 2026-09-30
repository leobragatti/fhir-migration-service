import { MoonIcon, SunIcon } from "lucide-react-native"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { useThemeToggle } from "@/hooks/use-theme-preference"

export function ThemeToggle() {
  const [theme, toggle] = useThemeToggle()
  const next = theme === "dark" ? "light" : "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={toggle}
      accessibilityLabel={`Switch to ${next} theme`}
      className="web:mr-3 size-9 rounded-full"
    >
      <Icon as={theme === "dark" ? SunIcon : MoonIcon} className="size-5" />
    </Button>
  )
}
