import { createFileRoute } from "@tanstack/react-router"

import { NotesScreen } from "@/modules/notes"

export const Route = createFileRoute("/(workspace)/_protected/notes")({
  component: NotesScreen,
})
