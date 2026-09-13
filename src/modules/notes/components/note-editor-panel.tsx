import {
  BellIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"
import type { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { useState } from "react"

import { DeleteNoteDialog } from "@/modules/notes/components/delete-note-dialog"
import { NoteTabsBar } from "@/modules/notes/components/note-tabs-bar"
import { ReminderDialog } from "@/modules/notes/components/reminder-dialog"
import { ShareNoteDialog } from "@/modules/notes/components/share-note-dialog"
import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import { noteTags } from "@/modules/notes/lib/demo-notes"
import { noteEditorKit } from "@/modules/notes/lib/note-editor-kit"
import type { NotesSaveStatus } from "@/modules/notes/lib/use-notes-workspace"
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
import { ScrollArea } from "@/shared/components/ui/scroll-area"

interface NoteEditorPanelProps {
  note: DemoNote | undefined
  openNotes: DemoNote[]
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<DemoNote, "title" | "body">>
  ) => void
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onDeleteNote: (id: string) => void
  onToggleList: () => void
  /** Null on builds without on-device persistence, where there is no local
      save to report. */
  saveStatus: NotesSaveStatus | null
}

export function NoteEditorPanel({
  note,
  openNotes,
  onUpdateNote,
  onSelectTab,
  onCloseTab,
  onDeleteNote,
  onToggleList,
  saveStatus,
}: NoteEditorPanelProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
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
              {noteTags(note).length > 0 && (
                <p className="text-muted-foreground truncate text-xs">
                  {noteTags(note)
                    .map((tag) => tag.label)
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saveStatus && (
            <span className="text-muted-foreground text-xs">
              {saveStatus === "saving" ? "Guardando…" : "Guardado"}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon" variant="ghost" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            {/* w-auto: the base class sizes the menu to w-(--anchor-width),
                which here is a 32px icon button, so it fell back to min-w-32
                and wrapped every label onto two lines. */}
            <DropdownMenuContent className="w-auto">
              <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                <Share2Icon /> Compartir nota
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsReminderOpen(true)}>
                <BellIcon /> Recordatorio
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                variant="destructive"
              >
                <Trash2Icon /> Eliminar nota
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
      {note && (
        <DeleteNoteDialog
          onConfirm={() => onDeleteNote(note.id)}
          onOpenChange={setIsDeleteOpen}
          open={isDeleteOpen}
        />
      )}
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
    <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
      <Plate
        editor={editor}
        onChange={({ value }: { value: Value }) => {
          onUpdateNote(note.id, { body: value })
        }}
      >
        {/* overflow-y-visible: Plate's container variant ships overflow-y-auto,
            which would scroll natively and leave the ScrollArea inert. */}
        <EditorContainer className="min-h-full overflow-y-visible">
          <Editor
            className="min-h-full text-sm leading-relaxed"
            onMouseDown={(event) => {
              // The editable fills the panel, so clicking the blank space below
              // the last block hits the editable root itself. Browsers disagree
              // on what that does — some place the caret at the end, others
              // extend the current selection — so place it explicitly.
              if (event.target !== event.currentTarget) {
                return
              }
              event.preventDefault()
              editor.tf.focus()
              editor.tf.select(editor.api.end([]), { edge: "end" })
            }}
            placeholder="Escribe algo, o '/' para comandos..."
            variant="none"
          />
        </EditorContainer>
      </Plate>
    </ScrollArea>
  )
}
