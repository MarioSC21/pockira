import {
  BellIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  Share2Icon,
} from "lucide-react"
import type { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { useState } from "react"

import { NoteTabsBar } from "@/modules/notes/components/note-tabs-bar"
import { ReminderDialog } from "@/modules/notes/components/reminder-dialog"
import { ShareNoteDialog } from "@/modules/notes/components/share-note-dialog"
import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import { noteEditorKit } from "@/modules/notes/lib/note-editor-kit"
import {
  Editor,
  EditorContainer,
} from "@/shared/components/custom-components/editor/components/editor"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/shared/lib/utils"

interface NoteEditorPanelProps {
  note: DemoNote | undefined
  openNotes: DemoNote[]
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<DemoNote, "title" | "body">>
  ) => void
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  isListOpen: boolean
  onToggleList: () => void
}

export function NoteEditorPanel({
  note,
  openNotes,
  onUpdateNote,
  onSelectTab,
  onCloseTab,
  isListOpen,
  onToggleList,
}: NoteEditorPanelProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        isListOpen && "hidden md:flex"
      )}
    >
      <NoteTabsBar
        activeNoteId={note?.id}
        notes={openNotes}
        onCloseTab={onCloseTab}
        onSelectTab={onSelectTab}
      />
      <header className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button onClick={onToggleList} size="icon-sm" variant="ghost">
            <PanelLeftIcon />
          </Button>
          {note && (
            <div className="min-w-0">
              <input
                className="w-full bg-transparent text-xl font-semibold outline-none"
                onChange={(event) =>
                  onUpdateNote(note.id, { title: event.target.value })
                }
                placeholder="Título"
                value={note.title}
              />
              {note.tags.length > 0 && (
                <p className="text-muted-foreground truncate text-xs">
                  {note.tags.map((tag) => tag.label).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline">Guardar</Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon" variant="ghost" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                <Share2Icon /> Compartir nota
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsReminderOpen(true)}>
                <BellIcon /> Recordatorio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ShareNoteDialog
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        shareUrl="pockira.app/n/hbi-plan-34"
      />
      <ReminderDialog onOpenChange={setIsReminderOpen} open={isReminderOpen} />
      {note ? (
        <NoteEditorBody key={note.id} note={note} onUpdateNote={onUpdateNote} />
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Selecciona o crea una nota
        </div>
      )}
    </div>
  )
}

function NoteEditorBody({
  note,
  onUpdateNote,
}: {
  note: DemoNote
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<DemoNote, "title" | "body">>
  ) => void
}) {
  const editor = usePlateEditor({
    plugins: noteEditorKit,
    value: note.body,
  })

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      <Plate
        editor={editor}
        onChange={({ value }: { value: Value }) => {
          onUpdateNote(note.id, { body: value })
        }}
      >
        <EditorContainer className="h-full">
          <Editor
            className="text-sm leading-relaxed"
            placeholder="Escribe algo, o '/' para comandos..."
            variant="none"
          />
        </EditorContainer>
      </Plate>
    </div>
  )
}
