import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"

import { ErrorAlert } from "@/components/error-alert"
import { PaginationBar } from "@/components/pagination-bar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { usePageParam } from "@/hooks/use-page-param"
import { api, formatDateTime, type Observation } from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="min-w-36 flex-1 gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      {typeof children === "string" ? <Text className="text-sm">{children}</Text> : children}
    </View>
  )
}

function ObservationRow({ observation }: { observation: Observation }) {
  return (
    <View className="gap-1 px-6 py-3">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 font-medium">{observation.display || "Unnamed observation"}</Text>
        <Text className="font-semibold">{observation.valueText || "—"}</Text>
      </View>
      <View className="flex-row flex-wrap gap-x-3">
        <Text className="text-sm text-muted-foreground">
          {formatDateTime(observation.effectiveDatetime)}
        </Text>
        {observation.code ? (
          <Text className="font-mono text-xs leading-5 text-muted-foreground">
            {observation.code}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export default function PatientDetailScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>()
  const [page, setPage] = usePageParam()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.getPatient(id),
  })

  const observations = useQuery({
    queryKey: ["patient-observations", id, page, PAGE_SIZE],
    queryFn: () => api.getPatientObservations(id, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: patient.isSuccess,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.refetchQueries({ queryKey: ["patient", id] })
    await queryClient.refetchQueries({ queryKey: ["patient-observations", id] })
    setRefreshing(false)
  }

  return (
    <>
      <Stack.Screen options={{ title: patient.data?.name || "Patient" }} />
      <ScrollView
        className="bg-background"
        contentContainerClassName="mx-auto w-full max-w-3xl gap-6 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {patient.isError ? (
          <ErrorAlert title="Could not load patient" error={patient.error} />
        ) : (
          <Card>
            <CardHeader>
              {patient.isPending ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                <CardTitle className="text-xl">{patient.data.name || "Unknown"}</CardTitle>
              )}
              <CardDescription className="font-mono text-xs">Patient/{id}</CardDescription>
            </CardHeader>
            <CardContent>
              {patient.isPending ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <View className="flex-row flex-wrap gap-4">
                  <Field label="Gender">
                    <Badge variant="secondary" className="self-start">
                      <Text className="capitalize">{patient.data.gender ?? "unknown"}</Text>
                    </Badge>
                  </Field>
                  <Field label="Birth date">{patient.data.birthDate ?? "—"}</Field>
                  <Field label="Identifiers">{patient.data.identifier || "—"}</Field>
                  <Field label="Migrated at">{formatDateTime(patient.data.createdAt)}</Field>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {patient.isSuccess && (
          <Card>
            <CardHeader>
              <CardTitle>Observations</CardTitle>
              <CardDescription>Most recent first.</CardDescription>
            </CardHeader>
            <CardContent className="gap-4 px-0">
              {observations.isError ? (
                <View className="px-6">
                  <ErrorAlert title="Could not load observations" error={observations.error} />
                </View>
              ) : observations.isPending ? (
                <View className="gap-3 px-6">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </View>
              ) : observations.data.items.length === 0 ? (
                <Text className="px-6 py-8 text-center text-muted-foreground">
                  This patient has no observations.
                </Text>
              ) : (
                <View className={cn(observations.isPlaceholderData && "opacity-60")}>
                  {observations.data.items.map((observation, i) => (
                    <View key={observation.id}>
                      {i > 0 && <Separator />}
                      <ObservationRow observation={observation} />
                    </View>
                  ))}
                </View>
              )}

              {observations.data && (
                <View className="px-6">
                  <PaginationBar
                    page={page}
                    totalPages={observations.data.total}
                    onPageChange={setPage}
                  />
                </View>
              )}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </>
  )
}
