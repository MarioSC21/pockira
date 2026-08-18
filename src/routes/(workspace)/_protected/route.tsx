import { createFileRoute } from "@tanstack/react-router"

import { ProtectedLayout } from "@/modules/workspace"

export const Route = createFileRoute("/(workspace)/_protected")({
  component: ProtectedLayout,
})
