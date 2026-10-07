import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { ImportDeviceNotesDialog } from "@/modules/notes/components/import-device-notes-dialog"
import { NoteEditorPanel } from "@/modules/notes/components/note-editor-panel"
import { NotesListPanel } from "@/modules/notes/components/notes-list-panel"
import { NotesPicker } from "@/modules/notes/components/notes-picker"
import { NotesStartScreen } from "@/modules/notes/components/notes-start-screen"
import { useAccountNotesWorkspace } from "@/modules/notes/hooks/use-account-notes-workspace"
import { useDeviceNotesWorkspace } from "@/modules/notes/hooks/use-device-notes-workspace"
import { useReminderNotifications } from "@/modules/notes/hooks/use-reminder-notifications"
import { ALL_NOTES_FILTER } from "@/modules/notes/lib/note-filters"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type { NotesWorkspace } from "@/modules/notes/types/notes-workspace"
import { Button } from "@/shared/components/ui/button"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { useAppCommand } from "@/shared/lib/app-commands"
import { cn } from "@/shared/lib/utils"

/** "account": notes synced with the backend. "device": guest notes kept only
    on this device. */
export type NotesSource = "account" | "device"

interface NotesScreenProps {
  source: NotesSource
}

export function NotesScreen({ source }: NotesScreenProps) {
  return source === "account" ? <AccountNotesScreen /> : <DeviceNotesScreen />
}

function useNotesListControls() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [filter, setFilter] = useState<NoteFilter>(ALL_NOTES_FILTER)
  const [search, setSearch] = useState("")

  return {
    filter,
    search,
    selectedDate,
    setFilter,
    setSearch,
    setSelectedDate,
  }
}

type NotesListControls = ReturnType<typeof useNotesListControls>

function AccountNotesScreen() {
  const controls = useNotesListControls()
  const workspace = useAccountNotesWorkspace(controls)
  useReminderNotifications()

  return (
    <>
      <NotesWorkspaceView controls={controls} workspace={workspace} />
      <ImportDeviceNotesDialog />
    </>
  )
}

function DeviceNotesScreen() {
  const controls = useNotesListControls()
  const workspace = useDeviceNotesWorkspace(controls)

  return <NotesWorkspaceView controls={controls} workspace={workspace} />
}

function NotesWorkspaceView({
  controls,
  workspace,
}: {
  controls: NotesListControls
  workspace: NotesWorkspace
}) {
  const isMobile = useIsMobile()
  // Mobile: whether the list (instead of the editor) fills the screen.
  const [isListOpen, setIsListOpen] = useState(true)
  // Desktop: whether the notes picker popover is open.
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const {
    filter,
    search,
    selectedDate,
    setFilter,
    setSearch,
    setSelectedDate,
  } = controls
  const {
    closeTab: handleCloseTab,
    deleteNote: handleDeleteNote,
    loadMore: handleLoadMore,
    togglePin: handleTogglePin,
    updateNote: handleUpdateNote,
  } = workspace

  const handleSelectNote = (id: string) => {
    workspace.selectNote(id)
    if (isMobile) {
      setIsListOpen(false)
    }
  }

  // Picking a day on the calendar is itself a filter, so it replaces whichever
  // tab was active.
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setFilter({ date, kind: "day" })
  }

  const handleFilterChange = (nextFilter: NoteFilter) => {
    if (nextFilter.kind === "day") {
      setSelectedDate(nextFilter.date)
    }
    setFilter(nextFilter)
  }

  // On mobile the list and the editor swap places. On desktop there is no list
  // column: the list lives in the picker popover launched from the tab bar.
  const handleToggleList = () => {
    if (isMobile) {
      setIsListOpen((prev) => !prev)
    } else {
      setIsPickerOpen((prev) => !prev)
    }
  }

  const handleCreateNote = async () => {
    const created = await workspace.createNote()

    if (!created) {
      return
    }

    // The note is created for today, so move the list there instead of leaving
    // it filtered out of view.
    setSearch("")
    setSelectedDate(created.createdAt)
    setFilter({ date: created.createdAt, kind: "day" })
    setIsPickerOpen(false)
    if (isMobile) {
      setIsListOpen(false)
    }
  }

  // The desktop menu (and its shortcuts) drive the same actions.
  useAppCommand("new-note", handleCreateNote)
  useAppCommand("toggle-notes-list", handleToggleList)

  const editorProps = {
    canCollaborate: workspace.canCollaborate,
    note: workspace.selectedNote,
    onCloseTab: handleCloseTab,
    onDeleteNote: handleDeleteNote,
    onSelectTab: handleSelectNote,
    onUpdateNote: handleUpdateNote,
    openNotes: workspace.openNotes,
    saveStatus: workspace.saveStatus,
  }

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 w-full">
        <div className={cn("h-full w-full", !isListOpen && "hidden")}>
          <NotesListPanel
            error={workspace.error}
            filter={filter}
            hasMore={workspace.hasMore}
            isLoading={workspace.isLoading}
            isLoadingMore={workspace.isLoadingMore}
            notes={workspace.notes}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onFilterChange={handleFilterChange}
            onLoadMore={handleLoadMore}
            onSearchChange={setSearch}
            onSelectDate={handleSelectDate}
            onSelectNote={handleSelectNote}
            onTogglePin={handleTogglePin}
            search={search}
            selectedDate={selectedDate}
            selectedNoteId={workspace.selectedNote?.id}
          />
        </div>
        <div
          className={cn("flex h-full min-w-0 flex-1", isListOpen && "hidden")}
        >
          <NoteEditorPanel {...editorProps} onToggleList={handleToggleList} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full">
      <NoteEditorPanel
        {...editorProps}
        emptyState={
          <NotesStartScreen
            notes={workspace.notes}
            onCreateNote={handleCreateNote}
            onOpenPicker={() => setIsPickerOpen(true)}
            onSelectNote={handleSelectNote}
          />
        }
        tabsLeading={
          <NotesPicker
            error={workspace.error}
            filter={filter}
            hasMore={workspace.hasMore}
            isLoading={workspace.isLoading}
            isLoadingMore={workspace.isLoadingMore}
            notes={workspace.notes}
            onDeleteNote={handleDeleteNote}
            onFilterChange={handleFilterChange}
            onLoadMore={handleLoadMore}
            onOpenChange={setIsPickerOpen}
            onSearchChange={setSearch}
            onSelectDate={handleSelectDate}
            onSelectNote={handleSelectNote}
            onTogglePin={handleTogglePin}
            open={isPickerOpen}
            openNoteIds={workspace.openNotes.map((note) => note.id)}
            search={search}
            selectedDate={selectedDate}
          />
        }
        tabsTrailing={
          <Button
            aria-label="Nueva nota"
            onClick={handleCreateNote}
            size="icon-sm"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
        }
      />
    </div>
  )
}
