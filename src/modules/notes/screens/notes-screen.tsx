import { useState } from "react"

import { NoteEditorPanel } from "@/modules/notes/components/note-editor-panel"
import { NotesListPanel } from "@/modules/notes/components/notes-list-panel"
import { demoNotes } from "@/modules/notes/lib/demo-notes"
import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import { useIsMobile } from "@/shared/hooks/use-mobile"

export function NotesScreen() {
  const isMobile = useIsMobile()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [isListOpen, setIsListOpen] = useState(true)
  const [notes, setNotes] = useState(demoNotes)
  const [selectedNoteId, setSelectedNoteId] = useState(demoNotes[0]?.id)
  const [openNoteIds, setOpenNoteIds] = useState(() =>
    demoNotes[0] ? [demoNotes[0].id] : []
  )

  const selectedNote = notes.find((note) => note.id === selectedNoteId)
  const openNotes = openNoteIds
    .map((id) => notes.find((note) => note.id === id))
    .filter((note): note is DemoNote => note !== undefined)

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (isMobile) {
      setIsListOpen(false)
    }
  }

  const handleCreateNote = () => {
    const newNote: DemoNote = {
      id: crypto.randomUUID(),
      title: "",
      body: [{ children: [{ text: "" }], type: "p" }],
      pinned: false,
      tags: [],
    }
    setNotes((prev) => [newNote, ...prev])
    handleSelectNote(newNote.id)
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

  return (
    <div className="flex h-svh min-h-0 w-full">
      <NotesListPanel
        notes={notes}
        onCreateNote={handleCreateNote}
        onSelectDate={setSelectedDate}
        onSelectNote={handleSelectNote}
        open={isListOpen}
        selectedDate={selectedDate}
        selectedNoteId={selectedNoteId}
      />
      <NoteEditorPanel
        isListOpen={isListOpen}
        note={selectedNote}
        onCloseTab={handleCloseTab}
        onSelectTab={handleSelectNote}
        onToggleList={() => setIsListOpen((prev) => !prev)}
        onUpdateNote={handleUpdateNote}
        openNotes={openNotes}
      />
    </div>
  )
}
