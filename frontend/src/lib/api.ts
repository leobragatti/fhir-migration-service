import Constants from "expo-constants"
import { Platform } from "react-native"

/**
 * Backend base URL. Set EXPO_PUBLIC_API_URL to override. Otherwise, in development on a
 * device or emulator, use the dev machine's address (the host Metro is served from),
 * since `localhost` there points at the device itself.
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0]
  if (Platform.OS !== "web" && devHost) return `http://${devHost}:8000`
  return "http://localhost:8000"
}

export const API_URL = resolveApiUrl()

export type JobStatus =
  | "queued"
  | "started"
  | "deferred"
  | "scheduled"
  | "finished"
  | "failed"
  | "stopped"
  | "canceled"

export interface MigrationProgress {
  processed?: number
  errors?: number
  total?: number
}

export interface MigrationJob {
  id: string
  status: JobStatus
  result: MigrationProgress | null
  meta: MigrationProgress | null
  enqueuedAt: string | null
  startedAt: string | null
  endedAt: string | null
}

export interface Patient {
  id: string
  name: string
  birthDate: string | null
  gender: string | null
  identifier: string | null
  createdAt: string | null
}

export interface Observation {
  id: string
  patientId: string
  code: string | null
  display: string | null
  valueText: string | null
  effectiveDatetime: string | null
}

/** Paged response. `total` is the number of pages, not the number of items. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === "string" ? body.detail : response.statusText
    throw new ApiError(response.status, detail || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function pageQuery(page: number, pageSize: number) {
  return new URLSearchParams({ page: String(page), page_size: String(pageSize) })
}

export const api = {
  getMigration: () => request<MigrationJob>("/migrations/"),
  startMigration: () => request<MigrationJob>("/migrations/", { method: "POST" }),
  getPatients: (page: number, pageSize: number, name?: string) => {
    const query = pageQuery(page, pageSize)
    if (name) query.set("name", name)
    return request<Page<Patient>>(`/patients/?${query}`)
  },
  getPatient: (id: string) => request<Patient>(`/patients/${encodeURIComponent(id)}`),
  getPatientObservations: (id: string, page: number, pageSize: number) =>
    request<Page<Observation>>(
      `/patients/${encodeURIComponent(id)}/observations?${pageQuery(page, pageSize)}`
    ),
}

export function isJobActive(status: JobStatus | undefined) {
  return status === "queued" || status === "started" || status === "deferred" || status === "scheduled"
}

/** Backend timestamps are naive UTC; mark them as UTC before parsing. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
  const date = new Date(hasZone ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
