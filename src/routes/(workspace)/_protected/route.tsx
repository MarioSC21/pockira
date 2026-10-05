import { createFileRoute, Navigate, redirect } from "@tanstack/react-router"

import {
  AccountMenu,
  sessionQueryOptions,
  useSession,
} from "@/modules/authentication"
import { ProtectedLayout } from "@/modules/workspace"

export const Route = createFileRoute("/(workspace)/_protected")({
  // Resolves at once from the last known session (no network wait on launch).
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    )

    if (!(session.user || session.isGuest)) {
      throw redirect({ replace: true, to: "/login" })
    }
  },
  component: ProtectedRoute,
})

function ProtectedRoute() {
  // The guard trusted the stored session; if the backend then says it has
  // expired or was signed out elsewhere, leave for the login screen.
  const { data: session } = useSession()

  if (session && !(session.user || session.isGuest)) {
    return <Navigate replace to="/login" />
  }

  return <ProtectedLayout footer={<AccountMenu />} />
}
