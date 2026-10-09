import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import {
  isNativeStoreAvailable,
  readNativeStore,
  writeNativeStore,
} from "@/shared/service/native-store"

const STORE_FILE = "notes.json"
const WORKSPACE_KEY = "workspace"
// The web build has no native store, so a guest's notes go to localStorage.
const WEB_STORAGE_KEY = "pockira:guest-notes"
// Bumped whenever the stored shape changes, so an old file can be recognised
// instead of guessed at.
const WORKSPACE_VERSION = 1

/** Everything restored on the next launch: the notes plus which of them were
    open and active, the way a code editor reopens its tabs. */
export interface DeviceNotesWorkspace {
  notes: WorkspaceNote[]
  openNoteIds: string[]
  selectedNoteId: string | undefined
}

/** JSON has no Date, so the dates travel as ISO strings. Notes stored before
    `updatedAt` existed lack it. */
export type StoredNote = Omit<WorkspaceNote, "createdAt" | "updatedAt"> & {
  createdAt: string
  updatedAt?: string
}

interface StoredWorkspace {
  version: number
  notes: StoredNote[]
  openNoteIds: string[]
  selectedNoteId?: string
}

export function toStoredNote(note: WorkspaceNote): StoredNote {
  return {
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

function parseDate(value: string | undefined, fallback: Date) {
  const date = new Date(value ?? Number.NaN)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export function fromStoredNote(note: StoredNote): WorkspaceNote {
  const createdAt = parseDate(note.createdAt, new Date())

  return {
    ...note,
    // Notes kept on the device are always the person's own; copies stored
    // before these flags existed lack them.
    canEdit: true,
    createdAt,
    isOwner: true,
    updatedAt: parseDate(note.updatedAt, createdAt),
  }
}

/** Drops tabs pointing at notes that no longer exist and re-picks the active
    one, so a restored workspace can never open on an empty editor. */
function reconcile(stored: StoredWorkspace): DeviceNotesWorkspace {
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

function readStored(): Promise<StoredWorkspace | null> {
  if (isNativeStoreAvailable()) {
    return readNativeStore<StoredWorkspace>(STORE_FILE, WORKSPACE_KEY)
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY)

  return Promise.resolve(raw ? (JSON.parse(raw) as StoredWorkspace) : null)
}

async function writeStored(stored: StoredWorkspace) {
  if (isNativeStoreAvailable()) {
    await writeNativeStore(STORE_FILE, WORKSPACE_KEY, stored)
    return
  }

  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(stored))
}

/** The stored workspace, or null when there is nothing to restore (first
    launch, or a file from an older version). */
export async function loadDeviceNotesWorkspace(): Promise<DeviceNotesWorkspace | null> {
  const stored = await readStored()

  if (!stored || stored.version !== WORKSPACE_VERSION) {
    return null
  }

  return reconcile(stored)
}

export async function saveDeviceNotesWorkspace(
  workspace: DeviceNotesWorkspace
) {
  await writeStored({
    version: WORKSPACE_VERSION,
    notes: workspace.notes.map(toStoredNote),
    openNoteIds: workspace.openNoteIds,
    selectedNoteId: workspace.selectedNoteId,
  })
}
