import { createFileRoute, redirect } from "@tanstack/react-router"

import { AccountMenu, sessionQueryOptions } from "@/modules/authentication"
import { ProtectedLayout } from "@/modules/workspace"

export const Route = createFileRoute("/(workspace)/_protected")({
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
  return <ProtectedLayout footer={<AccountMenu />} />
}
