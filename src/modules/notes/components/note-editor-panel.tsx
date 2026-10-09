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
import type { ReactNode } from "react"

import { DeleteNoteDialog } from "@/modules/notes/components/delete-note-dialog"
import { NoteTabsBar } from "@/modules/notes/components/note-tabs-bar"
import { ReminderDialog } from "@/modules/notes/components/reminder-dialog"
import { ShareNoteDialog } from "@/modules/notes/components/share-note-dialog"
import { noteEditorKit } from "@/modules/notes/lib/note-editor-kit"
import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { noteTags } from "@/modules/notes/lib/workspace-note"
import type { NotesSaveStatus } from "@/modules/notes/types/notes-workspace"
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

const SAVE_STATUS_LABEL: Record<NotesSaveStatus, string> = {
  error: "Error al guardar",
  saved: "Guardado",
  saving: "Guardando…",
}

interface NoteEditorPanelProps {
  /** Sharing and reminders need an account; guests do not see them. */
  canCollaborate: boolean
  note: WorkspaceNote | undefined
  openNotes: WorkspaceNote[]
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<WorkspaceNote, "title" | "body">>
  ) => void
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onDeleteNote: (id: string) => void
  /** Mobile only: switches back to the list. Desktop has no list column. */
  onToggleList?: () => void
  /** Pinned before the tabs (the desktop notes picker). */
  tabsLeading?: ReactNode
  /** Right after the last tab (the desktop new-note button). */
  tabsTrailing?: ReactNode
  /** Shown instead of the editor when no note is open. */
  emptyState?: ReactNode
  saveStatus: NotesSaveStatus | null
}

export function NoteEditorPanel({
  canCollaborate,
  note,
  openNotes,
  onUpdateNote,
  onSelectTab,
  onCloseTab,
  onDeleteNote,
  onToggleList,
  tabsLeading,
  tabsTrailing,
  emptyState,
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
        leading={tabsLeading}
        onSelectTab={onSelectTab}
        trailing={tabsTrailing}
      />
      {(note || onToggleList) && (
        <header className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {onToggleList && (
              <Button
                aria-label="Ver lista de notas"
                onClick={onToggleList}
                size="icon-sm"
                variant="ghost"
              >
                <PanelLeftIcon />
              </Button>
            )}
            {note && <NoteTitleField note={note} onUpdateNote={onUpdateNote} />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saveStatus && <SaveStatusLabel status={saveStatus} />}
            {note && (canCollaborate || note.isOwner) && (
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
                  {canCollaborate && note.isOwner && (
                    <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                      <Share2Icon /> Compartir nota
                    </DropdownMenuItem>
                  )}
                  {canCollaborate && (
                    <DropdownMenuItem onClick={() => setIsReminderOpen(true)}>
                      <BellIcon /> Recordatorio
                    </DropdownMenuItem>
                  )}
                  {note.isOwner && (
                    <DropdownMenuItem
                      onClick={() => setIsDeleteOpen(true)}
                      variant="destructive"
                    >
                      <Trash2Icon /> Eliminar nota
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
      )}
      {note && canCollaborate && (
        <>
          <ShareNoteDialog
            noteId={note.id}
            onOpenChange={setIsShareOpen}
            open={isShareOpen}
          />
          <ReminderDialog
            noteId={note.id}
            onOpenChange={setIsReminderOpen}
            open={isReminderOpen}
          />
        </>
      )}
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
        (emptyState ?? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Selecciona o crea una nota
          </div>
        ))
      )}
    </div>
  )
}

function NoteTitleField({
  note,
  onUpdateNote,
}: {
  note: WorkspaceNote
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<WorkspaceNote, "title" | "body">>
  ) => void
}) {
  const tags = noteTags(note)

  return (
    <div className="min-w-0">
      <input
        className="w-full bg-transparent text-xl font-semibold outline-none"
        onChange={(event) =>
          onUpdateNote(note.id, { title: event.target.value })
        }
        placeholder="Título"
        value={note.title}
      />
      {tags.length > 0 && (
        <p className="text-muted-foreground truncate text-xs">
          {tags.map((tag) => tag.label).join(" · ")}
        </p>
      )}
    </div>
  )
}

function SaveStatusLabel({ status }: { status: NotesSaveStatus }) {
  return (
    <span
      className={
        status === "error"
          ? "text-destructive text-xs"
          : "text-muted-foreground text-xs"
      }
    >
      {SAVE_STATUS_LABEL[status]}
    </span>
  )
}

function NoteEditorBody({
  note,
  onUpdateNote,
}: {
  note: WorkspaceNote
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<WorkspaceNote, "title" | "body">>
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
        // onValueChange, not onChange: onChange also fires when only the
        // selection moves, so a click would mark the note as edited.
        onValueChange={({ value }: { value: Value }) => {
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
