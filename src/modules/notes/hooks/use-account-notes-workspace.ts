import { useQueries, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import type { Value } from "platejs"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  emptyNoteBody,
  extractText,
  toEditorValue,
  toNoteContent,
} from "@/modules/notes/lib/note-body"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type {
  WorkspaceNote,
  WorkspaceNotePatch,
} from "@/modules/notes/lib/workspace-note"
import type {
  ListNotesParams,
  ListNotesResult,
} from "@/modules/notes/service/api"
import { noteKeys } from "@/modules/notes/service/keys"
import {
  useClaimNoteInvitations,
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from "@/modules/notes/service/mutations"
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

type Draft = Partial<{ title: string; body: Value }>

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
    // The backend filters days by last modification (list_notes), so the
    // card shows that same date to stay consistent with the calendar.
    createdAt: new Date(note.updated_at),
    id: note.id,
    isOwner: note.is_owner ?? true,
    pinned,
    shared: note.is_shared ?? false,
    title: draft?.title ?? note.title,
  }
}

/** Nothing worth a row in the database has been written yet. */
function isBlank(note: Pick<WorkspaceNote, "title" | "body">) {
  return note.title.trim() === "" && extractText(note.body) === ""
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

/**
 * Signed-in mode: notes come from the backend through TanStack Query. The
 * open tabs and the pinned set are UI state; edits are kept as local drafts
 * and saved after a short pause in typing. A new note lives only here until
 * something is written in it; its first save inserts the row.
 */
export function useAccountNotesWorkspace({
  filter,
  search,
}: NotesWorkspaceQuery): NotesWorkspace {
  const queryClient = useQueryClient()
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useNotesList(toListParams(filter, debouncedSearch))

  const createMutation = useCreateNote()
  const updateMutation = useUpdateNote()
  const deleteMutation = useDeleteNote()
  const claimInvitations = useClaimNoteInvitations()

  const [openNoteIds, setOpenNoteIds] = useState<string[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string>()
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  // Notes opened with "new note" that have no row yet.
  const [localNotes, setLocalNotes] = useState<Record<string, WorkspaceNote>>(
    {}
  )
  const [actionError, setActionError] = useState<string | null>(null)

  // Refs are written eagerly: flushDraft runs from timers and callbacks
  // before React renders the change.
  const draftsRef = useRef(drafts)
  const localNotesRef = useRef(localNotes)
  // Local notes whose insert is in flight.
  const creatingIdsRef = useRef(new Set<string>())
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const flushDraftRef = useRef<(id: string) => void>(() => null)

  const updateDrafts = useCallback(
    (update: (prev: Record<string, Draft>) => Record<string, Draft>) => {
      draftsRef.current = update(draftsRef.current)
      setDrafts(draftsRef.current)
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

  // Someone may have shared notes with this email before the account
  // existed; claiming them once per session makes them show up.
  const { mutate: claim } = claimInvitations
  useEffect(() => {
    claim()
  }, [claim])

  const openQueries = useQueries({
    queries: openNoteIds
      .filter((id) => !(id in localNotes))
      .map((id) => ({
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
        updateLocalNotes((prev) => ({ ...prev, [id]: pending }))
        updateDrafts((prev) =>
          prev[id] === draft ? withoutKey(prev, id) : prev
        )
        return
      }

      creatingIdsRef.current.add(id)
      setActionError(null)
      insertNote(
        { content: toNoteContent(pending.body), id, title: pending.title },
        {
          onError: (error) => {
            creatingIdsRef.current.delete(id)
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

      const draft = draftsRef.current[id]

      if (!draft) {
        return
      }

      const localNote = localNotesRef.current[id]

      if (localNote) {
        insertLocalNote(id, localNote, draft)
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

  // Leaving the screen or hiding the app must not lose the last keystrokes.
  useEffect(() => {
    const flushAll = () => {
      for (const id of Object.keys(draftsRef.current)) {
        flushDraft(id)
      }
    }

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        flushAll()
      }
    }

    document.addEventListener("visibilitychange", flushOnHide)

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide)
      flushAll()
    }
  }, [flushDraft])

  const toView = (note: Note) =>
    toWorkspaceNote(note, drafts[note.id], pinnedIds.includes(note.id))

  const listedNotes = (list.data?.pages ?? [])
    .flatMap((page) => page.items)
    .map(toView)

  const fetchedNotes = new Map(
    openQueries
      .map((query) => query.data)
      .filter((note): note is Note => note !== undefined)
      .map((note) => [note.id, toView(note)])
  )

  const openNotes = openNoteIds
    .map((id) =>
      id in localNotes
        ? { ...localNotes[id], ...drafts[id] }
        : fetchedNotes.get(id)
    )
    .filter((note): note is WorkspaceNote => note !== undefined)

  const selectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const closeTab = (id: string) => {
    flushDraft(id)

    // A new note closed before anything was written in it is just dropped.
    if (id in localNotesRef.current && !creatingIdsRef.current.has(id)) {
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
    const created: WorkspaceNote = {
      body: emptyNoteBody(),
      createdAt: new Date(),
      // Picked here so the open tab keeps its id once the row is inserted.
      id: crypto.randomUUID(),
      isOwner: true,
      pinned: false,
      shared: false,
      title: "",
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

  const deleteNote = (id: string) => {
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
    deleteMutation.mutate(id, {
      onError: (error) =>
        setActionError(errorMessage(error) ?? "No se pudo eliminar la nota"),
    })
  }

  const togglePin = (id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((pinned) => pinned !== id) : [...prev, id]
    )
  }

  const getSaveStatus = (): NotesSaveStatus | null => {
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
      errorMessage(list.error) ??
      (updateMutation.isError
        ? `No se pudo guardar: ${errorMessage(updateMutation.error)}`
        : null),
    hasMore: list.hasNextPage,
    isLoading: list.isPending,
    isLoadingMore: list.isFetchingNextPage,
    loadMore: () => {
      void list.fetchNextPage()
    },
    notes: listedNotes,
    openNotes,
    saveStatus: getSaveStatus(),
    selectNote,
    selectedNote: openNotes.find((note) => note.id === selectedNoteId),
    togglePin,
    updateNote,
  }
}
