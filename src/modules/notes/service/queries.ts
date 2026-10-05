import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query"

import { note } from "./api"
import type { ListNotesParams, ListNotesResult, NoteCursor } from "./api"
import { noteKeys } from "./keys"
import { loadDeviceNotesWorkspace } from "./notes-workspace-store"

export const notesListQueryOptions = (
  params: Omit<ListNotesParams, "cursor">
) =>
  infiniteQueryOptions({
    getNextPageParam: (lastPage: ListNotesResult) => lastPage.nextCursor,
    initialPageParam: null as NoteCursor | null,
    queryFn: ({ pageParam }: { pageParam: NoteCursor | null }) =>
      note.list({ ...params, cursor: pageParam }),
    queryKey: noteKeys.list(params),
  })

export const useNotesList = (params: Omit<ListNotesParams, "cursor">) =>
  useInfiniteQuery(notesListQueryOptions(params))

export const noteDetailQueryOptions = (id: string) =>
  queryOptions({
    queryFn: () => note.get(id),
    queryKey: noteKeys.detail(id),
  })

export const useNote = (id: string) => useQuery(noteDetailQueryOptions(id))

export const noteCollaboratorsQueryOptions = (noteId: string) =>
  queryOptions({
    queryFn: () => note.collaborators(noteId),
    queryKey: noteKeys.collaborators(noteId),
  })

export const useNoteCollaborators = (noteId: string) =>
  useQuery(noteCollaboratorsQueryOptions(noteId))

export const deviceNotesQueryOptions = () =>
  queryOptions({
    queryFn: async () => {
      const workspace = await loadDeviceNotesWorkspace()
      return workspace?.notes ?? []
    },
    queryKey: noteKeys.device(),
  })

export const useDeviceNotes = () => useQuery(deviceNotesQueryOptions())

export const upcomingRemindersQueryOptions = () =>
  queryOptions({
    queryFn: note.upcomingReminders,
    queryKey: noteKeys.reminders(),
    // Picks up reminders created on other devices while this one stays open.
    refetchInterval: 5 * 60 * 1000,
  })

export const useUpcomingReminders = () =>
  useQuery(upcomingRemindersQueryOptions())
