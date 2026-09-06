import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import type { ReactNode } from "react"

import { router } from "@/router"
import { queryClient } from "@/shared/lib/query-client"

function RouterInnerWrap({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}

export function AppProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} InnerWrap={RouterInnerWrap} />
    </QueryClientProvider>
  )
}
