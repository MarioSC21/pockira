import { onlineManager, QueryClient } from "@tanstack/react-query"

// TanStack Query assumes it starts online and only listens for changes, so an
// app opened without a connection would try (and fail) every request instead
// of pausing them.
onlineManager.setOnline(navigator.onLine)

export const queryClient = new QueryClient()
