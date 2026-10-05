import { useQueries, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import type { Value } from "platejs"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  emptyNoteBody,
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

/**
 * Signed-in mode: notes come from the backend through TanStack Query. The
 * open tabs and the pinned set are UI state; edits are kept as local drafts
 * and saved after a short pause in typing.
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
  const [actionError, setActionError] = useState<string | null>(null)

  const draftsRef = useRef(drafts)
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  // Someone may have shared notes with this email before the account
  // existed; claiming them once per session makes them show up.
  const { mutate: claim } = claimInvitations
  useEffect(() => {
    claim()
  }, [claim])

  const openQueries = useQueries({
    queries: openNoteIds.map((id) => ({
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
  const flushDraft = useCallback(
    (id: string) => {
      const timer = saveTimersRef.current.get(id)
      clearTimeout(timer)
      saveTimersRef.current.delete(id)

      const draft = draftsRef.current[id]

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
            setDrafts((prev) => {
              if (prev[id] !== draft) {
                return prev
              }
              return withoutKey(prev, id)
            })
          },
        }
      )
    },
    [saveNote]
  )

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

  const openNotes = openQueries
    .map((query) => query.data)
    .filter((note): note is Note => note !== undefined)
    .map(toView)

  const selectNote = (id: string) => {
    setSelectedNoteId(id)
    setOpenNoteIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const closeTab = (id: string) => {
    flushDraft(id)

    const closingIndex = openNoteIds.indexOf(id)
    const nextOpenNoteIds = openNoteIds.filter(
      (openNoteId) => openNoteId !== id
    )
    setOpenNoteIds(nextOpenNoteIds)

    if (id === selectedNoteId) {
      setSelectedNoteId(nextOpenNoteIds[closingIndex] ?? nextOpenNoteIds.at(-1))
    }
  }

  const createNote = async () => {
    setActionError(null)

    try {
      const created = await createMutation.mutateAsync({
        content: toNoteContent(emptyNoteBody()),
        title: "",
      })
      selectNote(created.id)
      return toWorkspaceNote(
        { ...created, is_owner: true, is_shared: false },
        undefined,
        false
      )
    } catch (error) {
      setActionError(errorMessage(error) ?? "No se pudo crear la nota")
      return null
    }
  }

  const updateNote = (id: string, patch: WorkspaceNotePatch) => {
    setDrafts((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } }
      draftsRef.current = next
      return next
    })

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
    setDrafts((prev) => withoutKey(prev, id))
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

  const getSaveStatus = (): NotesSaveStatus => {
    if (updateMutation.isError) {
      return "error"
    }

    const hasPending =
      Object.keys(drafts).length > 0 || updateMutation.isPending

    return hasPending ? "saving" : "saved"
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
