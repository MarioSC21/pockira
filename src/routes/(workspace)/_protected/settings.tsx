import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(workspace)/_protected/settings")({
  component: SettingsRoute,
})

function SettingsRoute() {
  return (
    <section>
      <span className="text-muted-foreground text-sm font-medium">Cuenta</span>
      <h1 className="font-heading mt-2 text-3xl font-semibold">Ajustes</h1>
      <p className="text-muted-foreground mt-3">
        Esta ruta contendrá las preferencias de Pockira.
      </p>
    </section>
  )
}
