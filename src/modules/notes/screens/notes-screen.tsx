import { useState } from "react"
import { usePanelRef } from "react-resizable-panels"

import { ImportDeviceNotesDialog } from "@/modules/notes/components/import-device-notes-dialog"
import { NoteEditorPanel } from "@/modules/notes/components/note-editor-panel"
import { NotesListPanel } from "@/modules/notes/components/notes-list-panel"
import { useAccountNotesWorkspace } from "@/modules/notes/hooks/use-account-notes-workspace"
import { useDeviceNotesWorkspace } from "@/modules/notes/hooks/use-device-notes-workspace"
import { useReminderNotifications } from "@/modules/notes/hooks/use-reminder-notifications"
import { ALL_NOTES_FILTER } from "@/modules/notes/lib/note-filters"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type { NotesWorkspace } from "@/modules/notes/types/notes-workspace"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { useAppCommand } from "@/shared/lib/app-commands"
import { cn } from "@/shared/lib/utils"

// Pixel constraints for the notes list panel: the default matches the width the
// panel had before it became resizable.
const LIST_PANEL_DEFAULT_WIDTH = 320
const LIST_PANEL_MIN_WIDTH = 240
const LIST_PANEL_MAX_WIDTH = 560

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
  const listPanelRef = usePanelRef()
  const [isListOpen, setIsListOpen] = useState(true)
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

  // On mobile the two panels swap places, so the toggle is plain state. On
  // desktop the list lives in a resizable panel that owns its own width, so the
  // toggle drives the panel and `isListOpen` follows through onResize.
  const handleToggleList = () => {
    if (isMobile) {
      setIsListOpen((prev) => !prev)
      return
    }

    const listPanel = listPanelRef.current

    if (listPanel?.isCollapsed()) {
      listPanel.expand()
    } else {
      listPanel?.collapse()
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
    if (isMobile) {
      setIsListOpen(false)
    }
  }

  // The desktop menu (and its shortcuts) drive the same actions.
  useAppCommand("new-note", handleCreateNote)
  useAppCommand("toggle-notes-list", handleToggleList)

  const listPanel = (
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
  )

  const editorPanel = (
    <NoteEditorPanel
      canCollaborate={workspace.canCollaborate}
      note={workspace.selectedNote}
      onCloseTab={handleCloseTab}
      onDeleteNote={handleDeleteNote}
      onSelectTab={handleSelectNote}
      onToggleList={handleToggleList}
      onUpdateNote={handleUpdateNote}
      openNotes={workspace.openNotes}
      saveStatus={workspace.saveStatus}
    />
  )

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 w-full">
        <div className={cn("h-full w-full", !isListOpen && "hidden")}>
          {listPanel}
        </div>
        <div
          className={cn("flex h-full min-w-0 flex-1", isListOpen && "hidden")}
        >
          {editorPanel}
        </div>
      </div>
    )
  }

  return (
    <ResizablePanelGroup className="h-full min-h-0" orientation="horizontal">
      <ResizablePanel
        collapsedSize={0}
        collapsible
        defaultSize={LIST_PANEL_DEFAULT_WIDTH}
        maxSize={LIST_PANEL_MAX_WIDTH}
        minSize={LIST_PANEL_MIN_WIDTH}
        onResize={(size) => setIsListOpen(size.inPixels > 0)}
        panelRef={listPanelRef}
      >
        {listPanel}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="flex min-w-0">{editorPanel}</ResizablePanel>
    </ResizablePanelGroup>
  )
}
