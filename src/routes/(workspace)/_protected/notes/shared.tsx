import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(workspace)/_protected/notes/shared")({
  component: SharedNotesRoute,
})

function SharedNotesRoute() {
  return (
    <section>
      <span className="text-muted-foreground text-sm font-medium">
        Colaboración
      </span>
      <h1 className="font-heading mt-2 text-3xl font-semibold">
        Notas compartidas
      </h1>
      <p className="text-muted-foreground mt-3">
        Esta ruta mostrará las notas compartidas con la persona autenticada.
      </p>
    </section>
  )
}
