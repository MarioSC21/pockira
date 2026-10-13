import { XIcon } from "lucide-react"
import type { MouseEvent, ReactNode } from "react"

import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { cn } from "@/shared/lib/utils"

interface NoteTabsBarProps {
  notes: WorkspaceNote[]
  activeNoteId: string | undefined
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  /** Pinned before the tabs (e.g. the desktop notes picker). */
  leading?: ReactNode
  /** Right after the last tab (e.g. the new-note button). */
  trailing?: ReactNode
  /** Pinned to the right end (the open note's save status and menu). */
  actions?: ReactNode
}

const MIDDLE_BUTTON = 1

/** The browser starts its autoscroll on a middle press; a tab closes instead. */
function preventMiddleButtonScroll(event: MouseEvent) {
  if (event.button === MIDDLE_BUTTON) {
    event.preventDefault()
  }
}

export function NoteTabsBar({
  notes,
  activeNoteId,
  onSelectTab,
  onCloseTab,
  leading,
  trailing,
  actions,
}: NoteTabsBarProps) {
  if (notes.length === 0 && !leading && !actions) {
    return null
  }

  // Middle click closes a tab, as in a browser.
  const closeOnMiddleClick = (id: string) => (event: MouseEvent) => {
    if (event.button === MIDDLE_BUTTON) {
      event.preventDefault()
      onCloseTab(id)
    }
  }

  return (
    <div className="bg-muted/30 flex shrink-0 items-end">
      {leading ? (
        // Bottom-aligned like the tabs, with a divider so it reads as part of
        // the strip instead of a floating pill.
        <div className="flex h-10 shrink-0 items-end gap-2 pt-2 pl-2">
          {leading}
          <span aria-hidden className="bg-border mb-2 h-4 w-px" />
        </div>
      ) : null}
      <ScrollArea
        className="min-w-0 flex-1"
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
                  onAuxClick={closeOnMiddleClick(note.id)}
                  onClick={() => onSelectTab(note.id)}
                  onMouseDown={preventMiddleButtonScroll}
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
                  onAuxClick={closeOnMiddleClick(note.id)}
                  onClick={(event) => {
                    event.stopPropagation()
                    onCloseTab(note.id)
                  }}
                  onMouseDown={preventMiddleButtonScroll}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            )
          })}
          {trailing ? (
            <div className="flex h-8 shrink-0 items-center">{trailing}</div>
          ) : null}
        </div>
      </ScrollArea>
      {actions ? (
        <div className="flex h-10 shrink-0 items-center gap-1 pr-2 pl-1">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
