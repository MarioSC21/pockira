import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/modules/authentication"
import { NotesScreen } from "@/modules/notes"

export const Route = createFileRoute("/(workspace)/_protected/notes")({
  component: NotesRoute,
})

function NotesRoute() {
  const { data: session } = useSession()

  // Signed-in notes live in the backend; a guest's stay on this device. The
  // key remounts the screen so the two never share in-memory state.
  const source = session?.user ? "account" : "device"

  return <NotesScreen key={source} source={source} />
}
