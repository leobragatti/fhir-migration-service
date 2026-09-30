import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { RefreshControl, ScrollView } from "react-native"

import { MigrationCard } from "@/components/migration-card"
import { PatientList } from "@/components/patient-list"

export default function HomeScreen() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await queryClient.refetchQueries({ queryKey: ["migration"] })
    await queryClient.refetchQueries({ queryKey: ["patients"] })
    setRefreshing(false)
  }

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="mx-auto w-full max-w-3xl gap-6 p-4"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <MigrationCard />
      <PatientList />
    </ScrollView>
  )
}
