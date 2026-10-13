import {
  readNativeStore,
  writeNativeStore,
} from "@/shared/service/native-store"

// A signed-in person's open tabs are UI state of this device and come back
// after leaving the notes page or restarting the app. Keyed by account so
// another account on the same device never inherits them.
//
// The webview's storage is read first because it answers at once, but the
// webview writes it to disk some seconds later, and quitting the app (or an
// update restarting it) before that loses the last tabs. Desktop and Android
// therefore also keep them in the device store, which is saved on every
// change and wins when the app starts.
const STORAGE_KEY_PREFIX = "pockira:open-tabs:"
const STORE_FILE = "open-tabs.json"

export interface OpenTabs {
  openNoteIds: string[]
  selectedNoteId: string | undefined
}

const EMPTY_TABS: OpenTabs = { openNoteIds: [], selectedNoteId: undefined }

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function toOpenTabs(stored: Partial<OpenTabs> | null): OpenTabs | null {
  if (!stored || !isStringArray(stored.openNoteIds)) {
    return null
  }

  const { openNoteIds } = stored
  const selectedNoteId =
    stored.selectedNoteId && openNoteIds.includes(stored.selectedNoteId)
      ? stored.selectedNoteId
      : openNoteIds[0]

  return { openNoteIds, selectedNoteId }
}

export function readOpenTabs(accountId: string): OpenTabs {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${accountId}`)

    return (
      toOpenTabs(raw ? (JSON.parse(raw) as Partial<OpenTabs>) : null) ??
      EMPTY_TABS
    )
  } catch {
    return EMPTY_TABS
  }
}

/** The tabs kept in the device store, or null when it holds none for this
    account (the web, or the first launch since they are kept there). */
export async function loadStoredOpenTabs(
  accountId: string
): Promise<OpenTabs | null> {
  try {
    return toOpenTabs(
      await readNativeStore<Partial<OpenTabs>>(STORE_FILE, accountId)
    )
  } catch {
    return null
  }
}

async function writeStoredOpenTabs(accountId: string, tabs: OpenTabs) {
  try {
    await writeNativeStore(STORE_FILE, accountId, tabs)
  } catch {
    // The webview's copy below is still there.
  }
}

export function writeOpenTabs(accountId: string, tabs: OpenTabs) {
  void writeStoredOpenTabs(accountId, tabs)

  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${accountId}`,
      JSON.stringify(tabs)
    )
  } catch {
    // Blocked storage only means the tabs are not reopened next time.
  }
}
