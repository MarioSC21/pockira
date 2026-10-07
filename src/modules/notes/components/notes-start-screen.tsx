import { HistoryIcon, NotebookPenIcon, PinIcon, PlusIcon } from "lucide-react"

import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { formatNoteShortDate } from "@/modules/notes/lib/workspace-note"
import { Button } from "@/shared/components/ui/button"

const QUICK_NOTES_LIMIT = 4

interface NotesStartScreenProps {
  notes: WorkspaceNote[]
  onCreateNote: () => void
  onOpenPicker: () => void
  onSelectNote: (id: string) => void
}

/** Shown on desktop when no note is open in a tab. */
export function NotesStartScreen({
  notes,
  onCreateNote,
  onOpenPicker,
  onSelectNote,
}: NotesStartScreenProps) {
  // Pinned notes when there are any; otherwise the latest ones. The list
  // already arrives most recently edited first.
  const pinnedNotes = notes.filter((note) => note.pinned)
  const showsPinned = pinnedNotes.length > 0
  const quickNotes = (showsPinned ? pinnedNotes : notes).slice(
    0,
    QUICK_NOTES_LIMIT
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 overflow-y-auto px-6 py-12 text-center">
      <span className="bg-muted text-muted-foreground mb-1 flex size-12 items-center justify-center rounded-xl">
        <NotebookPenIcon className="size-5.5" />
      </span>
      <h2 className="text-lg font-semibold text-balance">
        Crea una nota para comenzar
      </h2>
      <p className="text-muted-foreground mb-2 max-w-[40ch] text-sm leading-relaxed">
        Escribe ideas, listas o recordatorios. Tus notas guardadas están en{" "}
        <span className="text-foreground font-medium">Notas</span>.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onCreateNote}>
          <PlusIcon />
          Nueva nota
        </Button>
        <Button onClick={onOpenPicker} variant="outline">
          Abrir una nota
        </Button>
      </div>
      {quickNotes.length > 0 && (
        <div className="mt-5 flex w-full max-w-85 flex-col text-left">
          <p className="text-muted-foreground flex items-center gap-1.5 px-2 pb-1.5 text-[11px] font-medium tracking-wide uppercase">
            {showsPinned ? (
              <PinIcon className="size-3" />
            ) : (
              <HistoryIcon className="size-3" />
            )}
            {showsPinned ? "Fijadas" : "Recientes"}
          </p>
          {quickNotes.map((note) => (
            <button
              className="hover:bg-muted flex h-8 items-center gap-2 rounded-lg px-2 text-left text-sm"
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">
                {note.title || "Nueva nota"}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {formatNoteShortDate(note.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
