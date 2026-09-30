import { AlertCircleIcon } from "lucide-react-native"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ErrorAlert({ title, error }: { title: string; error: Error }) {
  return (
    <Alert variant="destructive" icon={AlertCircleIcon}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
