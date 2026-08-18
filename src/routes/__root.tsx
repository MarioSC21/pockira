import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import {
  RouteError,
  RoutePending,
} from "@/shared/components/custom-components/feedback/router-feedback"
import type { RouterContext } from "@/shared/types/router-context"

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <RouteError error={error} onRetry={reset} />
  ),
  notFoundComponent: NotFoundRoute,
  pendingComponent: RoutePending,
})

function NotFoundRoute() {
  return (
    <section className="route-state">
      <span className="eyebrow">404</span>
      <h1>This route does not exist.</h1>
      <p>The destination may have moved or the address may be incomplete.</p>
      <Link className="button button-primary" to="/login">
        Go to sign in
      </Link>
    </section>
  )
}

function RootLayout() {
  return (
    <>
      <Outlet />

      {import.meta.env.DEV ? (
        <>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools initialIsOpen={false} />
        </>
      ) : null}
    </>
  )
}
