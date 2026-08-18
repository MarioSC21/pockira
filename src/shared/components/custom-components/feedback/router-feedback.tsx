import { Button } from "@/shared/components/ui/button"

interface RouteErrorProps {
  error: Error
  onRetry: () => void
}

interface RoutePendingProps {
  label?: string
}

export function RouteError({ error, onRetry }: RouteErrorProps) {
  return (
    <section className="route-state route-state-error" aria-live="assertive">
      <span className="eyebrow">Something went wrong</span>
      <h1>We could not open this view.</h1>
      <p>{error.message}</p>
      <Button onClick={onRetry}>Try again</Button>
    </section>
  )
}

export function RoutePending({
  label = "Loading your workspace",
}: RoutePendingProps) {
  return (
    <section className="route-state" aria-busy="true" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <span className="eyebrow">One moment</span>
      <h1>{label}</h1>
      <p>The route loader is preparing the data before rendering.</p>
    </section>
  )
}
