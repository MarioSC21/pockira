import { createRouter } from "@tanstack/react-router"

import { queryClient } from "@/shared/lib/query-client"

import { routeTree } from "./routeTree.gen"

export const router = createRouter({
  context: { queryClient },
  defaultPendingMinMs: 320,
  defaultPendingMs: 120,
  defaultPreload: "intent",
  defaultPreloadDelay: 60,
  defaultPreloadStaleTime: 0,
  routeTree,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
