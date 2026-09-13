import { useCallback, useEffect, useRef, useState } from "react"

import { demoNotes } from "@/modules/notes/lib/demo-notes"
import type { NotesWorkspace } from "@/modules/notes/service/notes-workspace-store"
import {
  isNotesWorkspacePersisted,
  loadNotesWorkspace,
  saveNotesWorkspace,
} from "@/modules/notes/service/notes-workspace-store"

// Long enough that typing does not hit the disk on every keystroke, short
// enough that only a moment of work is at risk if the app dies.
const SAVE_DEBOUNCE_MS = 400

export type NotesSaveStatus = "saving" | "saved"

/**
 * Owns the notes and the open tabs, and keeps them on disk on the platforms
 * that persist locally. On the web build the state is plain React state: the
 * backend is the source of truth there, so nothing is written to the device.
 */
export function useNotesWorkspace() {
  const isPersisted = isNotesWorkspacePersisted()
  const [notes, setNotes] = useState(demoNotes)
  const [openNoteIds, setOpenNoteIds] = useState(() =>
    demoNotes[0] ? [demoNotes[0].id] : []
  )
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(
    demoNotes[0]?.id
  )
  const [isSaving, setIsSaving] = useState(false)

  // Writing stays blocked until the stored workspace has been read, otherwise
  // the demo seed would overwrite it on the first render.
  const isRestoredRef = useRef(!isPersisted)
  // Read by the flush below, which runs outside the render that produced the
  // change and so cannot close over the current state.
  const workspaceRef = useRef<NotesWorkspace>({
    notes,
    openNoteIds,
    selectedNoteId,
  })

  // Declared before the effects below so they always see the current state.
  useEffect(() => {
    workspaceRef.current = { notes, openNoteIds, selectedNoteId }
  }, [notes, openNoteIds, selectedNoteId])

  const save = useCallback(
    async (workspace: NotesWorkspace) => {
      if (!(isPersisted && isRestoredRef.current)) {
        return
      }

      setIsSaving(true)

      try {
        await saveNotesWorkspace(workspace)
      } catch {
        // A failed write must not take the editor down: the next change
        // retries with the whole workspace anyway.
      }

      setIsSaving(false)
    },
    [isPersisted]
  )

  useEffect(() => {
    if (!isPersisted) {
      return
    }

    let isActive = true

    const restore = async () => {
      try {
        const stored = await loadNotesWorkspace()

        if (isActive && stored) {
          setNotes(stored.notes)
          setOpenNoteIds(stored.openNoteIds)
          setSelectedNoteId(stored.selectedNoteId)
        }
      } catch {
        // An unreadable file falls back to the demo seed rather than leaving
        // the screen stuck with nothing.
      }

      isRestoredRef.current = true
    }

    void restore()

    return () => {
      isActive = false
    }
  }, [isPersisted])

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

  const getSaveStatus = (): NotesSaveStatus | null => {
    if (!isPersisted) {
      return null
    }

    return isSaving ? "saving" : "saved"
  }

  return {
    notes,
    openNoteIds,
    saveStatus: getSaveStatus(),
    selectedNoteId,
    setNotes,
    setOpenNoteIds,
    setSelectedNoteId,
  }
}
