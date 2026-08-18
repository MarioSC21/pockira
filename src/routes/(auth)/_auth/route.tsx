import { createFileRoute } from "@tanstack/react-router"

import { AuthLayout } from "@/modules/authentication"

export const Route = createFileRoute("/(auth)/_auth")({
  component: AuthLayout,
})
