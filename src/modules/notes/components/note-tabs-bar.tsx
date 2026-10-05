import { XIcon } from "lucide-react"

import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { cn } from "@/shared/lib/utils"

interface NoteTabsBarProps {
  notes: WorkspaceNote[]
  activeNoteId: string | undefined
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
}

export function NoteTabsBar({
  notes,
  activeNoteId,
  onSelectTab,
  onCloseTab,
}: NoteTabsBarProps) {
  if (notes.length === 0) {
    return null
  }

  return (
    <ScrollArea
      className="bg-muted/30 shrink-0"
      orientation="horizontal"
      scrollbarClassName="h-1! border-t-0! p-0"
    >
      <div className="flex h-10 items-end gap-1 px-2 pt-2">
        {notes.map((note) => {
          const isActive = note.id === activeNoteId

          return (
            <div
              className={cn(
                "group relative flex h-8 w-40 shrink-0 items-center gap-1 rounded-t-lg pl-3 transition-colors",
                isActive
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
              key={note.id}
            >
              <button
                className="min-w-0 flex-1 truncate py-2 text-left text-sm"
                onClick={() => onSelectTab(note.id)}
                type="button"
              >
                {note.title || "Nueva nota"}
              </button>
              <button
                aria-label={`Cerrar ${note.title || "nueva nota"}`}
                className={cn(
                  "hover:bg-accent hover:text-foreground mr-2 shrink-0 rounded-sm p-0.5 opacity-0 group-hover:opacity-100",
                  isActive && "opacity-100"
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab(note.id)
                }}
                type="button"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
