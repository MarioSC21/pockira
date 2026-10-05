import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { sessionQueryOptions } from "@/modules/authentication"

export const Route = createFileRoute("/(auth)/_auth")({
  // A guest may come here to sign in; only a real account skips the screen.
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    )

    if (session.user) {
      throw redirect({ replace: true, to: "/notes" })
    }
  },
  component: Outlet,
})
