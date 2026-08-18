import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(workspace)/_protected/notes/")({
  component: MyNotesRoute,
})

function MyNotesRoute() {
  return (
    <section>
      <span className="text-muted-foreground text-sm font-medium">
        Biblioteca
      </span>
      <h1 className="font-heading mt-2 text-3xl font-semibold">Mis notas</h1>
      <p className="text-muted-foreground mt-3">
        Esta ruta mostrará las notas creadas por la persona autenticada.
      </p>
    </section>
  )
}
