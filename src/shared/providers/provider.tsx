import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import { Toaster } from "sileo"

import { router } from "@/router"
import { queryClient } from "@/shared/lib/query-client"

export function AppProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider InnerWrap={NuqsAdapter} router={router} />
    </QueryClientProvider>
  )
}
