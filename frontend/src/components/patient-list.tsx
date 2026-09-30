import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { ChevronRightIcon, SearchIcon, XIcon } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Pressable, View } from "react-native"

import { ErrorAlert } from "@/components/error-alert"
import { PaginationBar } from "@/components/pagination-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { usePageParam } from "@/hooks/use-page-param"
import { api, type Patient } from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

/** Name filter kept in the `name` route param; typing is debounced and resets to page 1. */
function useNameSearch(): [string, string, (value: string) => void] {
  const params = useLocalSearchParams<{ name?: string }>()
  const name = params.name ?? ""
  const [input, setInput] = useState(name)
  const [syncedName, setSyncedName] = useState(name)

  // Pick up external changes (back/forward navigation) without clobbering what's being typed.
  if (name !== syncedName) {
    setSyncedName(name)
    if (name !== input.trim()) setInput(name)
  }

  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed === name) return
    const timer = setTimeout(() => {
      router.setParams({ name: trimmed || undefined, page: undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, name])

  return [name, input, setInput]
}

function PatientRow({ patient }: { patient: Patient }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/patients/[id]", params: { id: patient.id } })}
      accessibilityRole="link"
      accessibilityLabel={`Open ${patient.name || "patient"}`}
      className="flex-row items-center gap-3 px-6 py-3 active:bg-accent web:hover:bg-accent"
    >
      <View className="flex-1 gap-1">
        <Text className="font-medium" numberOfLines={1}>
          {patient.name || "Unknown"}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Text className="capitalize">{patient.gender ?? "unknown"}</Text>
          </Badge>
          <Text className="text-sm text-muted-foreground">
            {patient.birthDate ? `Born ${patient.birthDate}` : "Birth date unknown"}
          </Text>
        </View>
        <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
          {patient.id}
        </Text>
      </View>
      <Icon as={ChevronRightIcon} className="text-muted-foreground" />
    </Pressable>
  )
}

export function PatientList() {
  const [page, setPage] = usePageParam()
  const [name, searchInput, setSearchInput] = useNameSearch()

  const patients = useQuery({
    queryKey: ["patients", page, PAGE_SIZE, name],
    queryFn: () => api.getPatients(page, PAGE_SIZE, name || undefined),
    placeholderData: keepPreviousData,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patients</CardTitle>
        <CardDescription>Migrated patient records. Tap one to see observations.</CardDescription>
        <View className="relative mt-2 justify-center">
          <View className="absolute left-3 z-10" pointerEvents="none">
            <Icon as={SearchIcon} className="size-4 text-muted-foreground" />
          </View>
          <Input
            placeholder="Search by name…"
            accessibilityLabel="Search patients by name"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="px-9"
          />
          {searchInput ? (
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Clear search"
              className="absolute right-0"
              onPress={() => setSearchInput("")}
            >
              <Icon as={XIcon} className="size-4" />
            </Button>
          ) : null}
        </View>
      </CardHeader>

      <CardContent className="gap-4 px-0">
        {patients.isError ? (
          <View className="px-6">
            <ErrorAlert title="Could not load patients" error={patients.error} />
          </View>
        ) : patients.isPending ? (
          <View className="gap-3 px-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </View>
        ) : patients.data.items.length === 0 ? (
          <Text className="px-6 py-8 text-center text-muted-foreground">
            {name
              ? `No patients match "${name}".`
              : "No patients yet. Run the migration to import some."}
          </Text>
        ) : (
          <View className={cn(patients.isPlaceholderData && "opacity-60")}>
            {patients.data.items.map((patient, i) => (
              <View key={patient.id}>
                {i > 0 && <Separator />}
                <PatientRow patient={patient} />
              </View>
            ))}
          </View>
        )}

        {patients.data && (
          <View className="px-6">
            <PaginationBar page={page} totalPages={patients.data.total} onPageChange={setPage} />
          </View>
        )}
      </CardContent>
    </Card>
  )
}
