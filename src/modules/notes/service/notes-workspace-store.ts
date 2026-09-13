import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import {
  readNativeStore,
  writeNativeStore,
} from "@/shared/service/native-store"

export { isNativeStoreAvailable as isNotesWorkspacePersisted } from "@/shared/service/native-store"

const STORE_FILE = "notes.json"
const WORKSPACE_KEY = "workspace"
// Bumped whenever the stored shape changes, so an old file can be recognised
// instead of guessed at once the backend lands.
const WORKSPACE_VERSION = 1

/** Everything restored on the next launch: the notes plus which of them were
    open and active, the way a code editor reopens its tabs. */
export interface NotesWorkspace {
  notes: DemoNote[]
  openNoteIds: string[]
  selectedNoteId: string | undefined
}

/** JSON has no Date, so `createdAt` travels as an ISO string. */
type StoredNote = Omit<DemoNote, "createdAt"> & { createdAt: string }

interface StoredWorkspace {
  version: number
  notes: StoredNote[]
  openNoteIds: string[]
  selectedNoteId?: string
}

function toStoredNote(note: DemoNote): StoredNote {
  return { ...note, createdAt: note.createdAt.toISOString() }
}

function fromStoredNote(note: StoredNote): DemoNote {
  const createdAt = new Date(note.createdAt)

  return {
    ...note,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  }
}

/** Drops tabs pointing at notes that no longer exist and re-picks the active
    one, so a restored workspace can never open on an empty editor. */
function reconcile(stored: StoredWorkspace): NotesWorkspace {
  const notes = stored.notes.map(fromStoredNote)
  const openNoteIds = stored.openNoteIds.filter((id) =>
    notes.some((note) => note.id === id)
  )
  const selectedNoteId =
    stored.selectedNoteId && openNoteIds.includes(stored.selectedNoteId)
      ? stored.selectedNoteId
      : openNoteIds[0]

  return { notes, openNoteIds, selectedNoteId }
}

/** The stored workspace, or null when there is nothing to restore (first
    launch, or a build without on-device persistence). */
export async function loadNotesWorkspace(): Promise<NotesWorkspace | null> {
  const stored = await readNativeStore<StoredWorkspace>(
    STORE_FILE,
    WORKSPACE_KEY
  )

  if (!stored || stored.version !== WORKSPACE_VERSION) {
    return null
  }

  return reconcile(stored)
}

export async function saveNotesWorkspace(workspace: NotesWorkspace) {
  const stored: StoredWorkspace = {
    version: WORKSPACE_VERSION,
    notes: workspace.notes.map(toStoredNote),
    openNoteIds: workspace.openNoteIds,
    selectedNoteId: workspace.selectedNoteId,
  }

  await writeNativeStore(STORE_FILE, WORKSPACE_KEY, stored)
}
