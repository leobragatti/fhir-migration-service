import { router, useLocalSearchParams } from "expo-router"

/**
 * Current page number, kept in the `page` route param. On web that's `?page=` in the URL,
 * so it survives reloads and back/forward; on native it lives with the screen.
 */
export function usePageParam(): [number, (page: number) => void] {
  const params = useLocalSearchParams<{ page?: string }>()
  const parsed = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1

  const setPage = (next: number) => router.setParams({ page: String(next) })

  return [page, setPage]
}
