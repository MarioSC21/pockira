import { useState } from "react"
import { usePanelRef } from "react-resizable-panels"

import { NoteEditorPanel } from "@/modules/notes/components/note-editor-panel"
import { NotesListPanel } from "@/modules/notes/components/notes-list-panel"
import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import { ALL_NOTES_FILTER, filterNotes } from "@/modules/notes/lib/note-filters"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import { useNotesWorkspace } from "@/modules/notes/lib/use-notes-workspace"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { cn } from "@/shared/lib/utils"

// Pixel constraints for the notes list panel: the default matches the width the
// panel had before it became resizable.
const LIST_PANEL_DEFAULT_WIDTH = 320
const LIST_PANEL_MIN_WIDTH = 240
const LIST_PANEL_MAX_WIDTH = 560

export function NotesScreen() {
  const isMobile = useIsMobile()
  const listPanelRef = usePanelRef()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [filter, setFilter] = useState<NoteFilter>(ALL_NOTES_FILTER)
  const [search, setSearch] = useState("")
  const [isListOpen, setIsListOpen] = useState(true)
  const {
    notes,
    openNoteIds,
    saveStatus,
    selectedNoteId,
    setNotes,
    setOpenNoteIds,
    setSelectedNoteId,
  } = useNotesWorkspace()

  const selectedNote = notes.find((note) => note.id === selectedNoteId)
  const openNotes = openNoteIds
    .map((id) => notes.find((note) => note.id === id))
    .filter((note): note is DemoNote => note !== undefined)
  // Filtering only hides notes from the list: an open note stays open in its
  // tab even when the current filter no longer matches it.
  const visibleNotes = filterNotes(notes, filter, search)

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
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

  const handleCreateNote = () => {
    const createdAt = new Date()
    const newNote: DemoNote = {
      id: crypto.randomUUID(),
      title: "",
      body: [{ children: [{ text: "" }], type: "p" }],
      pinned: false,
      createdAt,
      shared: false,
    }
    setNotes((prev) => [newNote, ...prev])
    // The note is created for today, so move the list there instead of leaving
    // it filtered out of view.
    setSearch("")
    setSelectedDate(createdAt)
    setFilter({ date: createdAt, kind: "day" })
    handleSelectNote(newNote.id)
  }

  const handleTogglePin = (id: string) => {
    setNotes((prev) => [
      ...prev
        .filter((note) => note.id === id)
        .map((note) => ({ ...note, pinned: !note.pinned })),
      ...prev.filter((note) => note.id !== id),
    ])
  }

  const handleCloseTab = (id: string) => {
    const closingIndex = openNoteIds.indexOf(id)
    const nextOpenNoteIds = openNoteIds.filter(
      (openNoteId) => openNoteId !== id
    )
    setOpenNoteIds(nextOpenNoteIds)

    if (id === selectedNoteId) {
      const nextNoteId = nextOpenNoteIds[closingIndex] ?? nextOpenNoteIds.at(-1)
      setSelectedNoteId(nextNoteId)
    }
  }

  const handleUpdateNote = (
    id: string,
    patch: Partial<Pick<DemoNote, "title" | "body">>
  ) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...patch } : note))
    )
  }

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    handleCloseTab(id)
  }

  const listPanel = (
    <NotesListPanel
      filter={filter}
      notes={visibleNotes}
      onCreateNote={handleCreateNote}
      onDeleteNote={handleDeleteNote}
      onFilterChange={handleFilterChange}
      onSearchChange={setSearch}
      onSelectDate={handleSelectDate}
      onSelectNote={handleSelectNote}
      onTogglePin={handleTogglePin}
      search={search}
      selectedDate={selectedDate}
      selectedNoteId={selectedNoteId}
    />
  )

  const editorPanel = (
    <NoteEditorPanel
      note={selectedNote}
      onCloseTab={handleCloseTab}
      onDeleteNote={handleDeleteNote}
      onSelectTab={handleSelectNote}
      onToggleList={handleToggleList}
      onUpdateNote={handleUpdateNote}
      openNotes={openNotes}
      saveStatus={saveStatus}
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
