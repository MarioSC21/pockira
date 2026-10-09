import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/modules/authentication"
import { NotesScreen } from "@/modules/notes"

export const Route = createFileRoute("/(workspace)/_protected/notes")({
  component: NotesRoute,
})

function NotesRoute() {
  const { data: session } = useSession()

  // Signed-in notes live in the backend; a guest's stay on this device. The
  // key remounts the screen so two sources or accounts never share in-memory
  // state.
  const accountId = session?.user?.id
  const source = accountId ? "account" : "device"

  return (
    <NotesScreen
      accountId={accountId}
      key={accountId ?? source}
      source={source}
    />
  )
}
