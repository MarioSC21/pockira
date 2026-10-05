import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import { WindowTitlebar } from "@/shared/components/custom-components/layout/window-titlebar"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <WindowTitlebar />
      {/* The screens scroll inside this box so the scrollbar starts below
          the desktop title bar instead of running underneath it. */}
      <div className="h-app mt-(--titlebar-height) overflow-auto">
        <Outlet />
      </div>
    </>
  )
}
