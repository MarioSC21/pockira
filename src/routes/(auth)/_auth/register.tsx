import { createFileRoute } from "@tanstack/react-router"

import { RegisterScreen } from "@/modules/authentication"

export const Route = createFileRoute("/(auth)/_auth/register")({
  component: RegisterScreen,
})
