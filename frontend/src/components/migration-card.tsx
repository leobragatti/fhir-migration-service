import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlayIcon } from "lucide-react-native"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"

import { ErrorAlert } from "@/components/error-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { ApiError, api, formatDateTime, isJobActive, type JobStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

const STATUS_VARIANT: Record<JobStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  queued: "secondary",
  deferred: "secondary",
  scheduled: "secondary",
  started: "default",
  finished: "outline",
  failed: "destructive",
  stopped: "destructive",
  canceled: "destructive",
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className={cn("text-2xl font-semibold", className)}>{value}</Text>
    </View>
  )
}

function Timestamp({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm">{formatDateTime(value)}</Text>
    </View>
  )
}

export function MigrationCard() {
  const queryClient = useQueryClient()

  const migration = useQuery({
    queryKey: ["migration"],
    queryFn: async () => {
      try {
        return await api.getMigration()
      } catch (error) {
        // 404 means no migration has been run yet.
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    refetchInterval: (query) => (isJobActive(query.state.data?.status) ? 2000 : false),
  })

  const start = useMutation({
    mutationFn: api.startMigration,
    onSuccess: (job) => {
      queryClient.setQueryData(["migration"], job)
    },
  })

  const job = migration.data
  const active = isJobActive(job?.status)
  const busy = active || start.isPending
  // While running, progress lives in meta; once finished, the job result has the final counts.
  const progress = job?.result ?? job?.meta ?? {}

  // Refresh the patient list whenever the job reports new progress.
  const processed = progress.processed ?? 0
  useEffect(() => {
    if (processed > 0) void queryClient.invalidateQueries({ queryKey: ["patients"] })
  }, [processed, queryClient])

  return (
    <Card>
      <CardHeader>
        <CardTitle>FHIR migration</CardTitle>
        <CardDescription>
          Imports patients and their observations from the FHIR server into the internal
          database.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-5">
        {start.isError && <ErrorAlert title="Could not start the migration" error={start.error} />}

        {migration.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : migration.isError ? (
          <ErrorAlert title="Could not load the migration status" error={migration.error} />
        ) : !job ? (
          <Text className="text-sm text-muted-foreground">
            No migration has been run yet. Start one to import data.
          </Text>
        ) : (
          <>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-muted-foreground">Status</Text>
              <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"}>
                <Text className="capitalize">{job.status}</Text>
              </Badge>
            </View>
            <View className="gap-1.5">
              <Timestamp label="Queued" value={job.enqueuedAt} />
              <Timestamp label="Started" value={job.startedAt} />
              <Timestamp label="Ended" value={job.endedAt} />
            </View>
            <View className="flex-row gap-4">
              <Stat label="Handled" value={progress.total ?? 0} />
              <Stat label="Migrated" value={progress.processed ?? 0} />
              <Stat
                label="Errors"
                value={progress.errors ?? 0}
                className={progress.errors ? "text-destructive" : undefined}
              />
            </View>
          </>
        )}

        <Button onPress={() => start.mutate()} disabled={busy}>
          {busy ? <ActivityIndicator size="small" /> : <Icon as={PlayIcon} />}
          <Text>{active ? "Running…" : "Start migration"}</Text>
        </Button>
      </CardContent>
    </Card>
  )
}
