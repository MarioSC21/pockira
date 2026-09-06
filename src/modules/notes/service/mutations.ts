import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  NoteAccessRole,
  ReminderRepeatInterval,
  TiptapDoc,
} from "../types/note"
import { note } from "./api"
import { noteKeys } from "./keys"

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { title: string; content: TiptapDoc }) =>
      note.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Partial<{ title: string; content: TiptapDoc }>) =>
      note.update(id, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(noteKeys.detail(updated.id), updated)
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useShareNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      noteId,
      ...input
    }: {
      noteId: string
      email: string
      role: NoteAccessRole
    }) => note.share(noteId, input),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: noteKeys.collaborators(variables.noteId),
      })
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useCreateReminder() {
  return useMutation({
    mutationFn: ({
      noteId,
      ...input
    }: {
      noteId: string
      remindAt: string
      repeatInterval: ReminderRepeatInterval
    }) => note.createReminder(noteId, input),
  })
}
