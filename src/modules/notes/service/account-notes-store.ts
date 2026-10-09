import type { Value } from "platejs"

import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import type { Note } from "@/modules/notes/types/note"
import {
  isNativeStoreAvailable,
  readNativeStore,
  writeNativeStore,
} from "@/shared/service/native-store"

import { fromStoredNote, toStoredNote } from "./notes-workspace-store"
import type { StoredNote } from "./notes-workspace-store"

// Desktop and Android keep a copy of a signed-in account's notes, plus the
// edits not yet accepted by the backend, so the app opens and keeps working
// without a connection and sends the pending edits once it is back. The web
// keeps nothing: it needs the backend to load at all.
const STORE_FILE = "account-notes.json"
// Bumped whenever the stored shape changes, so an old file is ignored
// instead of guessed at.
const ACCOUNT_NOTES_VERSION = 1

/** Edits to a note not yet saved in the backend. */
export type NoteDraft = Partial<{ title: string; body: Value }>

export interface OfflineAccountNotes {
  /** Last copy of each row seen from the backend. */
  notes: Record<string, Note>
  /** Notes created on the device whose row does not exist yet. */
  localNotes: Record<string, WorkspaceNote>
  drafts: Record<string, NoteDraft>
}

interface StoredAccountNotes {
  version: number
  notes: Record<string, Note>
  localNotes: StoredNote[]
  drafts: Record<string, NoteDraft>
}

export function isOfflineNotesAvailable() {
  return isNativeStoreAvailable()
}

/** The account's offline copy, or null when there is none (first launch on
    this device, the web, or a file from an older version). */
export async function loadOfflineAccountNotes(
  accountId: string
): Promise<OfflineAccountNotes | null> {
  const stored = await readNativeStore<StoredAccountNotes>(
    STORE_FILE,
    accountId
  )

  if (!stored || stored.version !== ACCOUNT_NOTES_VERSION) {
    return null
  }

  return {
    drafts: stored.drafts,
    localNotes: Object.fromEntries(
      stored.localNotes.map((note) => [note.id, fromStoredNote(note)])
    ),
    notes: stored.notes,
  }
}

export async function saveOfflineAccountNotes(
  accountId: string,
  offline: OfflineAccountNotes
) {
  await writeNativeStore<StoredAccountNotes>(STORE_FILE, accountId, {
    drafts: offline.drafts,
    localNotes: Object.values(offline.localNotes).map(toStoredNote),
    notes: offline.notes,
    version: ACCOUNT_NOTES_VERSION,
  })
}
