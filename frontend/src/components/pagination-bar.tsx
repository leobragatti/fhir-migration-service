import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react-native"
import { View } from "react-native"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

interface PaginationBarProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** Previous / next controls. Page-number links don't fit well on a phone screen. */
export function PaginationBar({ page, totalPages, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null

  const isFirst = page <= 1
  const isLast = page >= totalPages

  return (
    <View className="flex-row items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isFirst}
        onPress={() => onPageChange(page - 1)}
        accessibilityLabel="Go to previous page"
      >
        <Icon as={ChevronLeftIcon} />
        <Text>Previous</Text>
      </Button>
      <Text className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </Text>
      <Button
        variant="outline"
        size="sm"
        disabled={isLast}
        onPress={() => onPageChange(page + 1)}
        accessibilityLabel="Go to next page"
      >
        <Text>Next</Text>
        <Icon as={ChevronRightIcon} />
      </Button>
    </View>
  )
}
