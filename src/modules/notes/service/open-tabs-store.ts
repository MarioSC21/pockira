// A signed-in person's open tabs are UI state of this device, so they live in
// the webview's storage (localStorage exists on web, desktop and Android) and
// come back after leaving the notes page or restarting the app. Keyed by
// account so another account on the same device never inherits them.
const STORAGE_KEY_PREFIX = "pockira:open-tabs:"

export interface OpenTabs {
  openNoteIds: string[]
  selectedNoteId: string | undefined
}

const EMPTY_TABS: OpenTabs = { openNoteIds: [], selectedNoteId: undefined }

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function readOpenTabs(accountId: string): OpenTabs {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${accountId}`)
    const stored = raw ? (JSON.parse(raw) as Partial<OpenTabs>) : null

    if (!stored || !isStringArray(stored.openNoteIds)) {
      return EMPTY_TABS
    }

    const { openNoteIds } = stored
    const selectedNoteId =
      stored.selectedNoteId && openNoteIds.includes(stored.selectedNoteId)
        ? stored.selectedNoteId
        : openNoteIds[0]

    return { openNoteIds, selectedNoteId }
  } catch {
    return EMPTY_TABS
  }
}

export function writeOpenTabs(accountId: string, tabs: OpenTabs) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${accountId}`,
      JSON.stringify(tabs)
    )
  } catch {
    // Blocked storage only means the tabs are not reopened next time.
  }
}
