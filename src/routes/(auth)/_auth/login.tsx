import { createFileRoute } from "@tanstack/react-router"

import { LoginScreen } from "@/modules/authentication"

export const Route = createFileRoute("/(auth)/_auth/login")({
  component: LoginScreen,
})
