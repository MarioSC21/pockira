import type { ListNotesParams } from "./api"

export const noteKeys = {
  all: ["notes"] as const,
  collaborators: (noteId: string) =>
    [...noteKeys.all, "collaborators", noteId] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  list: (params: Omit<ListNotesParams, "cursor">) =>
    [...noteKeys.lists(), params] as const,
  lists: () => [...noteKeys.all, "list"] as const,
}
