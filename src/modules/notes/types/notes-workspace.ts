import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type {
  WorkspaceNote,
  WorkspaceNotePatch,
} from "@/modules/notes/lib/workspace-note"

export type NotesSaveStatus = "saving" | "saved" | "error" | "offline"

/** What the list is currently asking for. */
export interface NotesWorkspaceQuery {
  filter: NoteFilter
  search: string
}

/**
 * The notes screen talks to this contract only, so it renders the same
 * whether the notes come from the device (guest) or the backend (account).
 */
export interface NotesWorkspace {
  /** Notes matching the current filter and search, for the list. */
  notes: WorkspaceNote[]
  /** Notes open in tabs; they stay open even when the filter hides them. */
  openNotes: WorkspaceNote[]
  selectedNote: WorkspaceNote | undefined
  saveStatus: NotesSaveStatus | null
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => void
  /** Account features (sharing, reminders) need the backend. */
  canCollaborate: boolean
  /** No connection: features that need the backend are disabled. */
  isOffline: boolean
  selectNote: (id: string) => void
  closeTab: (id: string) => void
  createNote: () => Promise<WorkspaceNote | null>
  updateNote: (id: string, patch: WorkspaceNotePatch) => void
  deleteNote: (id: string) => void
  togglePin: (id: string) => void
}
