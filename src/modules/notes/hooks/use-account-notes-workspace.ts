import {
  onlineManager,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query"
import type { InfiniteData, QueryKey } from "@tanstack/react-query"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import {
  emptyNoteBody,
  extractText,
  toEditorValue,
  toNoteContent,
} from "@/modules/notes/lib/note-body"
import { filterNotes } from "@/modules/notes/lib/note-filters"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type {
  WorkspaceNote,
  WorkspaceNotePatch,
} from "@/modules/notes/lib/workspace-note"
import {
  isOfflineNotesAvailable,
  loadOfflineAccountNotes,
  saveOfflineAccountNotes,
} from "@/modules/notes/service/account-notes-store"
import type {
  NoteDraft,
  OfflineAccountNotes,
} from "@/modules/notes/service/account-notes-store"
import type {
  ListNotesParams,
  ListNotesResult,
} from "@/modules/notes/service/api"
import { noteKeys } from "@/modules/notes/service/keys"
import {
  useCreateNote,
  useDeleteNote,
  useLeaveNote,
  useUpdateNote,
} from "@/modules/notes/service/mutations"
import {
  readOpenTabs,
  writeOpenTabs,
} from "@/modules/notes/service/open-tabs-store"
import {
  noteDetailQueryOptions,
  useNotesList,
} from "@/modules/notes/service/queries"
import type { Note } from "@/modules/notes/types/note"
import type {
  NotesSaveStatus,
  NotesWorkspace,
  NotesWorkspaceQuery,
} from "@/modules/notes/types/notes-workspace"

// Typing pauses shorter than this are merged into one request.
const SAVE_DEBOUNCE_MS = 700
// How long the offline copy waits for changes to settle before it is written.
const OFFLINE_SAVE_DEBOUNCE_MS = 400

const DELETE_NEEDS_CONNECTION = "Necesitas conexión para eliminar esta nota"

// Only desktop and Android keep a device copy; the web needs the backend.
const OFFLINE_NOTES_ENABLED = isOfflineNotesAvailable()
const SEARCH_DEBOUNCE_MS = 300

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}

function toListParams(
  filter: NoteFilter,
  search: string
): Omit<ListNotesParams, "cursor"> {
  const base = { search: search || undefined, timezone: TIMEZONE }

  switch (filter.kind) {
    case "day": {
      return {
        ...base,
        date: {
          day: filter.date.getDate(),
          month: filter.date.getMonth() + 1,
          year: filter.date.getFullYear(),
        },
        scope: "all",
      }
    }
    case "personal": {
      return { ...base, scope: "personal" }
    }
    case "shared": {
      return { ...base, scope: "shared" }
    }
    default: {
      return { ...base, scope: "all" }
    }
  }
}

/** A note already fetched by any list, so opening it needs no extra request. */
function findListedNote(
  lists: [unknown, InfiniteData<ListNotesResult> | undefined][],
  id: string
) {
  for (const [, data] of lists) {
    const found = data?.pages
      .flatMap((page) => page.items)
      .find((item) => item.id === id)

    if (found) {
      return found
    }
  }
}

type Draft = NoteDraft

function withoutKey<T>(record: Record<string, T>, key: string) {
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => entryKey !== key)
  )
}

function toWorkspaceNote(
  note: Note,
  draft: Draft | undefined,
  pinned: boolean
): WorkspaceNote {
  return {
    body: draft?.body ?? toEditorValue(note.content),
    canEdit: note.can_edit ?? true,
    // list_notes files notes under the day they were created, the same date
    // the card shows.
    createdAt: new Date(note.created_at),
    id: note.id,
    isOwner: note.is_owner ?? true,
    pinned,
    shared: note.is_shared ?? false,
    title: draft?.title ?? note.title,
    updatedAt: new Date(note.updated_at),
  }
}

/** Nothing worth a row in the database has been written yet. */
function isBlank(note: Pick<WorkspaceNote, "title" | "body">) {
  return note.title.trim() === "" && extractText(note.body) === ""
}

/** Rows held by the cached note queries: list pages or a single note. */
function notesInQuery(queryKey: QueryKey, data: unknown): Note[] {
  if (!data || queryKey[0] !== noteKeys.all[0]) {
    return []
  }

  if (queryKey[1] === "list") {
    return (data as InfiniteData<ListNotesResult>).pages.flatMap(
      (page) => page.items
    )
  }

  return queryKey[1] === "detail" ? [data as Note] : []
}

/** A row read without the computed flags keeps the ones already known. */
function mergeNotes(previous: Record<string, Note>, rows: Note[]) {
  const next = { ...previous }

  for (const row of rows) {
    next[row.id] = { ...next[row.id], ...row }
  }

  return next
}

/**
 * What the device copy keeps to reopen and finish the work: the notes seen,
 * the new notes with something written, and the unsaved edits.
 */
function toOfflineSnapshot(
  notes: Record<string, Note>,
  localNotes: Record<string, WorkspaceNote>,
  drafts: Record<string, Draft>
): OfflineAccountNotes {
  const localNotesToKeep = Object.fromEntries(
    Object.entries(localNotes).filter(
      ([id, note]) => !isBlank({ ...note, ...drafts[id] })
    )
  )
  const draftsToKeep = Object.fromEntries(
    Object.entries(drafts).filter(
      ([id]) => !(id in localNotes) || id in localNotesToKeep
    )
  )

  return { drafts: draftsToKeep, localNotes: localNotesToKeep, notes }
}

async function writeOfflineSnapshot(
  accountId: string,
  snapshot: OfflineAccountNotes
) {
  try {
    await saveOfflineAccountNotes(accountId, snapshot)
  } catch {
    // A failed write is retried with the whole copy on the next change.
  }
}

function subscribeToNetwork(onChange: () => void) {
  return onlineManager.subscribe(onChange)
}

function isNetworkOnline() {
  return onlineManager.isOnline()
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

/**
 * Signed-in mode: notes come from the backend through TanStack Query. The
 * open tabs and the pinned set are UI state; edits are kept as local drafts
 * and saved after a short pause in typing. A new note lives only here until
 * something is written in it; its first save inserts the row. The open tabs
 * are remembered on this device for `accountId`.
 *
 * On desktop and Android the notes seen and the unsaved edits are also kept on
 * the device, so without a connection the notes still open, can be written
 * and created, and the pending edits are sent once the connection is back.
 */
export function useAccountNotesWorkspace(
  { filter, search }: NotesWorkspaceQuery,
  accountId: string
): NotesWorkspace {
  const queryClient = useQueryClient()
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useNotesList(toListParams(filter, debouncedSearch))

  const createMutation = useCreateNote()
  const updateMutation = useUpdateNote()
  const deleteMutation = useDeleteNote()
  const leaveMutation = useLeaveNote()

  const [openNoteIds, setOpenNoteIds] = useState(
    () => readOpenTabs(accountId).openNoteIds
  )
  const [selectedNoteId, setSelectedNoteId] = useState(
    () => readOpenTabs(accountId).selectedNoteId
  )
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  // Notes opened with "new note" that have no row yet.
  const [localNotes, setLocalNotes] = useState<Record<string, WorkspaceNote>>(
    {}
  )
  const [actionError, setActionError] = useState<string | null>(null)
  // Last copy of each row seen from the backend (desktop and Android only).
  const [cachedNotes, setCachedNotes] = useState<Record<string, Note>>({})
  const [isRestoring, setIsRestoring] = useState(OFFLINE_NOTES_ENABLED)
  const isOnline = useSyncExternalStore(subscribeToNetwork, isNetworkOnline)
  // Offline, the list is built from the device copy instead of the backend.
  const isUsingDeviceCopy = OFFLINE_NOTES_ENABLED && !isOnline

  // Refs are written eagerly: flushDraft runs from timers and callbacks
  // before React renders the change.
  const draftsRef = useRef(drafts)
  const localNotesRef = useRef(localNotes)
  // Local notes whose insert is in flight.
  const creatingIdsRef = useRef(new Set<string>())
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const flushDraftRef = useRef<(id: string) => void>(() => null)
  const cachedNotesRef = useRef(cachedNotes)

  const updateDrafts = useCallback(
    (update: (prev: Record<string, Draft>) => Record<string, Draft>) => {
      draftsRef.current = update(draftsRef.current)
      setDrafts(draftsRef.current)
    },
    []
  )

  const updateCachedNotes = useCallback(
    (update: (prev: Record<string, Note>) => Record<string, Note>) => {
      cachedNotesRef.current = update(cachedNotesRef.current)
      setCachedNotes(cachedNotesRef.current)
    },
    []
  )

  const updateLocalNotes = useCallback(
    (
      update: (
        prev: Record<string, WorkspaceNote>
      ) => Record<string, WorkspaceNote>
    ) => {
      localNotesRef.current = update(localNotesRef.current)
      setLocalNotes(localNotesRef.current)
    },
    []
  )

  // Brings back the device copy and the edits that were still pending when
  // the app closed; until then nothing is fetched or remembered, so the
  // restored tabs are not mistaken for missing notes.
  useEffect(() => {
    if (!OFFLINE_NOTES_ENABLED) {
      return
    }

    let isActive = true

    const restore = async () => {
      try {
        const stored = await loadOfflineAccountNotes(accountId)
        const seen = queryClient
          .getQueriesData({ queryKey: noteKeys.all })
          .flatMap(([queryKey, data]) => notesInQuery(queryKey, data))

        if (isActive) {
          updateCachedNotes((prev) =>
            mergeNotes({ ...stored?.notes, ...prev }, seen)
          )

          if (stored) {
            updateLocalNotes((prev) => ({ ...stored.localNotes, ...prev }))
            updateDrafts((prev) => ({ ...stored.drafts, ...prev }))
          }
        }
      } catch {
        // An unreadable copy only means starting from the backend alone.
      }

      if (isActive) {
        setIsRestoring(false)
      }
    }

    void restore()

    return () => {
      isActive = false
    }
  }, [
    accountId,
    queryClient,
    updateCachedNotes,
    updateDrafts,
    updateLocalNotes,
  ])

  // Every note the backend returns (lists, details, saves) refreshes the copy.
  useEffect(() => {
    if (!OFFLINE_NOTES_ENABLED) {
      return
    }

    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") {
        return
      }

      const rows = notesInQuery(event.query.queryKey, event.query.state.data)

      if (rows.length > 0) {
        updateCachedNotes((prev) => mergeNotes(prev, rows))
      }
    })
  }, [queryClient, updateCachedNotes])

  // New notes without a row are not fetched.
  const fetchedIds = openNoteIds.filter((id) => !(id in localNotes))
  const openQueries = useQueries({
    queries: (isRestoring ? [] : fetchedIds).map((id) => ({
      ...noteDetailQueryOptions(id),
      initialData: () =>
        findListedNote(
          queryClient.getQueriesData<InfiniteData<ListNotesResult>>({
            queryKey: noteKeys.lists(),
          }),
          id
        ),
    })),
  })

  // A remembered tab whose note was deleted or unshared elsewhere cannot be
  // fetched any more; it is hidden and forgotten instead of lingering empty.
  const missingIds = new Set(
    fetchedIds.filter((_, index) => openQueries[index]?.isError)
  )
  // A new note is remembered once something is written in it, and only where
  // the device copy keeps it.
  const isKeptLocalNote = (id: string) =>
    OFFLINE_NOTES_ENABLED && !isBlank({ ...localNotes[id], ...drafts[id] })
  const keptIds = openNoteIds.filter(
    (id) =>
      (id in localNotes ? isKeptLocalNote(id) : true) && !missingIds.has(id)
  )

  const persistedTabsKey = JSON.stringify({
    openNoteIds: keptIds,
    selectedNoteId:
      selectedNoteId && keptIds.includes(selectedNoteId)
        ? selectedNoteId
        : keptIds[0],
  })
  useEffect(() => {
    if (!isRestoring) {
      writeOpenTabs(accountId, JSON.parse(persistedTabsKey))
    }
  }, [accountId, isRestoring, persistedTabsKey])

  const { mutate: saveNote } = updateMutation
  const { mutate: insertNote } = createMutation
  const { mutate: removeNote } = deleteMutation

  // First save of a new note: insert the row, unless it is still blank.
  const insertLocalNote = useCallback(
    (id: string, localNote: WorkspaceNote, draft: Draft) => {
      // The insert's success re-flushes whatever was typed meanwhile.
      if (creatingIdsRef.current.has(id)) {
        return
      }

      const pending = { ...localNote, ...draft }

      // Clicking around an empty new note must not create a row: keep the
      // edit in the local note and leave nothing pending.
      if (isBlank(pending)) {
        if (Object.keys(draft).length > 0) {
          updateLocalNotes((prev) => ({ ...prev, [id]: pending }))
          updateDrafts((prev) =>
            prev[id] === draft ? withoutKey(prev, id) : prev
          )
        }
        return
      }

      creatingIdsRef.current.add(id)
      setActionError(null)
      insertNote(
        { content: toNoteContent(pending.body), id, title: pending.title },
        {
          onError: (error) => {
            creatingIdsRef.current.delete(id)

            // The row already exists: an earlier insert reached the backend
            // but the app closed before hearing back. Continue as an update.
            if (errorMessage(error)?.includes("duplicate key")) {
              updateLocalNotes((prev) => withoutKey(prev, id))
              updateDrafts((prev) => ({
                ...prev,
                [id]: { body: pending.body, title: pending.title, ...prev[id] },
              }))
              flushDraftRef.current(id)
              return
            }

            setActionError(errorMessage(error) ?? "No se pudo crear la nota")
          },
          onSuccess: () => {
            creatingIdsRef.current.delete(id)

            // Deleted while the insert was in flight.
            if (!(id in localNotesRef.current)) {
              removeNote(id)
              return
            }

            updateLocalNotes((prev) => withoutKey(prev, id))

            if (draftsRef.current[id] === draft) {
              updateDrafts((prev) => withoutKey(prev, id))
            } else if (draftsRef.current[id]) {
              // More typing happened during the insert; now it is an update.
              flushDraftRef.current(id)
            }
          },
        }
      )
    },
    [insertNote, removeNote, updateDrafts, updateLocalNotes]
  )

  const flushDraft = useCallback(
    (id: string) => {
      const timer = saveTimersRef.current.get(id)
      clearTimeout(timer)
      saveTimersRef.current.delete(id)

      // Offline the edit stays as a draft (kept on the device) and is sent on
      // reconnect; a request paused until then could land after a newer one.
      if (!onlineManager.isOnline()) {
        return
      }

      const draft = draftsRef.current[id]
      const localNote = localNotesRef.current[id]

      if (localNote) {
        insertLocalNote(id, localNote, draft ?? {})
        return
      }

      if (!draft) {
        return
      }

      saveNote(
        {
          id,
          ...(draft.title === undefined ? {} : { title: draft.title }),
          ...(draft.body === undefined
            ? {}
            : { content: toNoteContent(draft.body) }),
        },
        {
          onSuccess: () => {
            // Keep the draft if more typing happened while this was in flight;
            // its own timer will send it.
            updateDrafts((prev) =>
              prev[id] === draft ? withoutKey(prev, id) : prev
            )
          },
        }
      )
    },
    [insertLocalNote, saveNote, updateDrafts]
  )

  useEffect(() => {
    flushDraftRef.current = flushDraft
  }, [flushDraft])

  // Edits made offline, or restored from the last run, are sent as soon as
  // there is a connection.
  useEffect(() => {
    if (isRestoring || !isOnline) {
      return
    }

    const pendingIds = new Set([
      ...Object.keys(draftsRef.current),
      ...Object.keys(localNotesRef.current),
    ])

    for (const id of pendingIds) {
      if (!saveTimersRef.current.has(id)) {
        flushDraftRef.current(id)
      }
    }
  }, [isOnline, isRestoring])

  useEffect(() => {
    if (!OFFLINE_NOTES_ENABLED || isRestoring) {
      return
    }

    const snapshot = toOfflineSnapshot(cachedNotes, localNotes, drafts)
    const timeout = setTimeout(() => {
      void writeOfflineSnapshot(accountId, snapshot)
    }, OFFLINE_SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [accountId, cachedNotes, drafts, isRestoring, localNotes])

  // Leaving the screen or hiding the app must not lose the last keystrokes.
  useEffect(() => {
    const flushAll = () => {
      for (const id of Object.keys(draftsRef.current)) {
        flushDraft(id)
      }
    }

    // Closing the app or sending it to the background can kill the webview
    // before the debounced write, so the device copy is written right away.
    const saveOffline = () => {
      if (OFFLINE_NOTES_ENABLED && !isRestoring) {
        void writeOfflineSnapshot(
          accountId,
          toOfflineSnapshot(
            cachedNotesRef.current,
            localNotesRef.current,
            draftsRef.current
          )
        )
      }
    }

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        flushAll()
        saveOffline()
      }
    }

    document.addEventListener("visibilitychange", flushOnHide)

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide)
      flushAll()
      saveOffline()
    }
  }, [accountId, flushDraft, isRestoring])

  const toView = (note: Note): WorkspaceNote => ({
    ...toWorkspaceNote(note, drafts[note.id], pinnedIds.includes(note.id)),
    // Deleting a note that exists in the backend waits for a connection;
    // queuing it could remove a note someone else is still editing.
    ...(isOnline ? {} : { deleteDisabledReason: DELETE_NEEDS_CONNECTION }),
  })

  const toLocalView = (id: string): WorkspaceNote => ({
    ...localNotes[id],
    ...drafts[id],
  })

  const deviceCopyNotes = [
    ...Object.keys(localNotes)
      .filter((id) => !isBlank(toLocalView(id)))
      .map(toLocalView),
    ...Object.values(cachedNotes)
      .filter((note) => !(note.id in localNotes))
      .map(toView),
  ]
  // oxlint-disable-next-line unicorn/no-array-sort -- sorts the fresh array built above; toSorted is not in the ES2022 lib this project targets
  deviceCopyNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const listedNotes = isUsingDeviceCopy
    ? filterNotes(deviceCopyNotes, filter, search)
    : (list.data?.pages ?? []).flatMap((page) => page.items).map(toView)

  const fetchedNotes = new Map(
    openQueries
      .map((query) => query.data)
      .filter((note): note is Note => note !== undefined)
      .map((note) => [note.id, toView(note)])
  )

  const openNotes = openNoteIds
    .filter((id) => !missingIds.has(id))
    .map((id) => {
      if (id in localNotes) {
        return toLocalView(id)
      }

      // Offline (or still loading) a tab shows the device copy.
      const cached = cachedNotes[id]
      return fetchedNotes.get(id) ?? (cached ? toView(cached) : undefined)
    })
    .filter((note): note is WorkspaceNote => note !== undefined)

  const selectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const closeTab = (id: string) => {
    flushDraft(id)

    // A new note closed before anything was written in it is just dropped;
    // one with content stays until its insert lands (offline, until then).
    const localNote = localNotesRef.current[id]
    if (
      localNote &&
      !creatingIdsRef.current.has(id) &&
      isBlank({ ...localNote, ...draftsRef.current[id] })
    ) {
      updateLocalNotes((prev) => withoutKey(prev, id))
    }

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
    const created: WorkspaceNote = {
      body: emptyNoteBody(),
      canEdit: true,
      createdAt: now,
      // Picked here so the open tab keeps its id once the row is inserted.
      id: crypto.randomUUID(),
      isOwner: true,
      pinned: false,
      shared: false,
      title: "",
      updatedAt: now,
    }
    updateLocalNotes((prev) => ({ ...prev, [created.id]: created }))
    selectNote(created.id)
    return Promise.resolve(created)
  }

  const updateNote = (id: string, patch: WorkspaceNotePatch) => {
    updateDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

    clearTimeout(saveTimersRef.current.get(id))
    saveTimersRef.current.set(
      id,
      setTimeout(() => flushDraft(id), SAVE_DEBOUNCE_MS)
    )
  }

  const findKnownNote = (id: string): Note | undefined =>
    queryClient.getQueryData<Note>(noteKeys.detail(id)) ??
    findListedNote(
      queryClient.getQueriesData<InfiniteData<ListNotesResult>>({
        queryKey: noteKeys.lists(),
      }),
      id
    ) ??
    cachedNotesRef.current[id]

  const deleteNote = (id: string) => {
    if (!(id in localNotesRef.current) && !isOnline) {
      return
    }

    setActionError(null)
    clearTimeout(saveTimersRef.current.get(id))
    saveTimersRef.current.delete(id)
    updateDrafts((prev) => withoutKey(prev, id))

    if (id in localNotesRef.current) {
      // No row yet; an insert still in flight deletes its row when it lands.
      updateLocalNotes((prev) => withoutKey(prev, id))
      closeTab(id)
      return
    }

    closeTab(id)

    // A note shared with this account is only removed from its notes; the
    // owner's note stays.
    const isShared = findKnownNote(id)?.is_owner === false
    const mutation = isShared ? leaveMutation : deleteMutation
    mutation.mutate(id, {
      onError: (error) =>
        setActionError(
          errorMessage(error) ??
            (isShared
              ? "No se pudo quitar la nota"
              : "No se pudo eliminar la nota")
        ),
      onSuccess: () => updateCachedNotes((prev) => withoutKey(prev, id)),
    })
  }

  const togglePin = (id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((pinned) => pinned !== id) : [...prev, id]
    )
  }

  const getSaveStatus = (): NotesSaveStatus | null => {
    // Edits keep being saved on the device; they are sent on reconnect.
    if (!isOnline) {
      return "offline"
    }

    if (updateMutation.isError || createMutation.isError) {
      return "error"
    }

    const hasPending =
      Object.keys(drafts).length > 0 ||
      updateMutation.isPending ||
      createMutation.isPending

    if (hasPending) {
      return "saving"
    }

    // An untouched new note has nothing saved to report.
    return selectedNoteId && selectedNoteId in localNotes ? null : "saved"
  }

  return {
    canCollaborate: true,
    closeTab,
    createNote,
    deleteNote,
    error:
      actionError ??
      (isUsingDeviceCopy ? null : errorMessage(list.error)) ??
      (updateMutation.isError
        ? `No se pudo guardar: ${errorMessage(updateMutation.error)}`
        : null),
    hasMore: !isUsingDeviceCopy && list.hasNextPage,
    isLoading: isRestoring || (!isUsingDeviceCopy && list.isPending),
    isLoadingMore: list.isFetchingNextPage,
    loadMore: () => {
      void list.fetchNextPage()
    },
    isOffline: !isOnline,
    notes: listedNotes,
    openNotes,
    saveStatus: getSaveStatus(),
    selectNote,
    selectedNote:
      openNotes.find((note) => note.id === selectedNoteId) ??
      (selectedNoteId && missingIds.has(selectedNoteId)
        ? openNotes[0]
        : undefined),
    togglePin,
    updateNote,
  }
}
