import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AuthProvider } from "@/modules/authentication"

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})
