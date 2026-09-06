import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query"

import { note } from "./api"
import type { ListNotesParams, ListNotesResult, NoteCursor } from "./api"
import { noteKeys } from "./keys"

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
