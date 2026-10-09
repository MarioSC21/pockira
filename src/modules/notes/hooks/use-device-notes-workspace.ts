import { useCallback, useEffect, useRef, useState } from "react"

import { emptyNoteBody } from "@/modules/notes/lib/note-body"
import { filterNotes } from "@/modules/notes/lib/note-filters"
import type {
  WorkspaceNote,
  WorkspaceNotePatch,
} from "@/modules/notes/lib/workspace-note"
import type { DeviceNotesWorkspace } from "@/modules/notes/service/notes-workspace-store"
import {
  loadDeviceNotesWorkspace,
  saveDeviceNotesWorkspace,
} from "@/modules/notes/service/notes-workspace-store"
import type {
  NotesWorkspace,
  NotesWorkspaceQuery,
} from "@/modules/notes/types/notes-workspace"

// Long enough that typing does not hit the disk on every keystroke, short
// enough that only a moment of work is at risk if the app dies.
const SAVE_DEBOUNCE_MS = 400

function isDefined(note: WorkspaceNote | undefined): note is WorkspaceNote {
  return note !== undefined
}

/**
 * Guest mode: the notes and the open tabs live only on this device (the
 * Tauri store on desktop/Android, localStorage on the web). Nothing here
 * talks to the backend.
 */
export function useDeviceNotesWorkspace({
  filter,
  search,
}: NotesWorkspaceQuery): NotesWorkspace {
  // A guest starts with an empty workspace; only what they write is shown.
  const [notes, setNotes] = useState<WorkspaceNote[]>([])
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string>()
  const [isRestoring, setIsRestoring] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // Writing stays blocked until the stored workspace has been read, otherwise
  // the empty initial state would overwrite it on the first render.
  const isRestoredRef = useRef(false)
  // Read by the flush below, which runs outside the render that produced the
  // change and so cannot close over the current state.
  const workspaceRef = useRef<DeviceNotesWorkspace>({
    notes,
    openNoteIds,
    selectedNoteId,
  })

  // Declared before the effects below so they always see the current state.
  useEffect(() => {
    workspaceRef.current = { notes, openNoteIds, selectedNoteId }
  }, [notes, openNoteIds, selectedNoteId])

  const save = useCallback(async (workspace: DeviceNotesWorkspace) => {
    if (!isRestoredRef.current) {
      return
    }

    setIsSaving(true)

    try {
      await saveDeviceNotesWorkspace(workspace)
      setSaveFailed(false)
    } catch {
      // A failed write must not take the editor down: the next change
      // retries with the whole workspace anyway.
      setSaveFailed(true)
    }

    setIsSaving(false)
  }, [])

  useEffect(() => {
    let isActive = true

    const restore = async () => {
      try {
        const stored = await loadDeviceNotesWorkspace()

        if (isActive && stored) {
          setNotes(stored.notes)
          setOpenNoteIds(stored.openNoteIds)
          setSelectedNoteId(stored.selectedNoteId)
        }
      } catch {
        // An unreadable file falls back to an empty workspace rather than
        // leaving the screen stuck loading.
      }

      isRestoredRef.current = true

      if (isActive) {
        setIsRestoring(false)
      }
    }

    void restore()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    const workspace = { notes, openNoteIds, selectedNoteId }
    const timeout = setTimeout(() => {
      void save(workspace)
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [save, notes, openNoteIds, selectedNoteId])

  // Closing the window, or the app going to background on mobile, can tear the
  // webview down before the debounce fires, so flush what is pending.
  useEffect(() => {
    const flush = () => {
      void save(workspaceRef.current)
    }

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        flush()
      }
    }

    document.addEventListener("visibilitychange", flushOnHide)

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide)
      flush()
    }
  }, [save])

  const selectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const closeTab = (id: string) => {
    const closingIndex = openNoteIds.indexOf(id)
    const nextOpenNoteIds = openNoteIds.filter(
      (openNoteId) => openNoteId !== id
    )
    setOpenNoteIds(nextOpenNoteIds)

    if (id === selectedNoteId) {
      setSelectedNoteId(nextOpenNoteIds[closingIndex] ?? nextOpenNoteIds.at(-1))
    }
  }

  const createNote = () => {
    const now = new Date()
    const newNote: WorkspaceNote = {
      body: emptyNoteBody(),
      createdAt: now,
      id: crypto.randomUUID(),
      isOwner: true,
      pinned: false,
      shared: false,
      title: "",
      updatedAt: now,
    }
    setNotes((prev) => [newNote, ...prev])
    selectNote(newNote.id)
    return Promise.resolve(newNote)
  }

  const updateNote = (id: string, patch: WorkspaceNotePatch) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: new Date() } : note
      )
    )
  }

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    closeTab(id)
  }

  const togglePin = (id: string) => {
    setNotes((prev) => [
      ...prev
        .filter((note) => note.id === id)
        .map((note) => ({ ...note, pinned: !note.pinned })),
      ...prev.filter((note) => note.id !== id),
    ])
  }

  const findNote = (id: string) => notes.find((note) => note.id === id)

  const getSaveStatus = () => {
    if (saveFailed) {
      return "error"
    }

    return isSaving ? "saving" : "saved"
  }

  return {
    canCollaborate: false,
    closeTab,
    createNote,
    deleteNote,
    error: saveFailed
      ? "No se pudieron guardar las notas en este dispositivo"
      : null,
    hasMore: false,
    isLoading: isRestoring,
    isOffline: false,
    isLoadingMore: false,
    loadMore: () => null,
    notes: filterNotes(notes, filter, search),
    openNotes: openNoteIds.map(findNote).filter(isDefined),
    saveStatus: getSaveStatus(),
    selectNote,
    selectedNote: selectedNoteId ? findNote(selectedNoteId) : undefined,
    togglePin,
    updateNote,
  }
}
