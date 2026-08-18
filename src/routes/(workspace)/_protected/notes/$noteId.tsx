import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(workspace)/_protected/notes/$noteId")({
  component: NoteDetailsRoute,
})

function NoteDetailsRoute() {
  const { noteId } = Route.useParams()

  return (
    <section>
      <span className="text-muted-foreground text-sm font-medium">
        Detalle de nota
      </span>
      <h1 className="font-heading mt-2 text-3xl font-semibold">{noteId}</h1>
      <p className="text-muted-foreground mt-3">
        Esta ruta mostrará el detalle de una nota propia o compartida.
      </p>
    </section>
  )
}
