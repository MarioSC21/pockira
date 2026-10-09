import { useMutation, useQueryClient } from "@tanstack/react-query"

import { toNoteContent } from "../lib/note-body"
import type { WorkspaceNote } from "../lib/workspace-note"
import type {
  Note,
  NoteAccessRole,
  ReminderRepeatInterval,
  TiptapDoc,
} from "../types/note"
import { note } from "./api"
import { noteKeys } from "./keys"
import { saveDeviceNotesWorkspace } from "./notes-workspace-store"

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id?: string; title: string; content: TiptapDoc }) =>
      note.create(input),
    onSuccess: async (created) => {
      // The row comes back without the computed flags list_notes adds.
      queryClient.setQueryData<Note>(noteKeys.detail(created.id), {
        ...created,
        is_owner: true,
        is_shared: false,
      })
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
      queryClient.setQueryData<Note>(noteKeys.detail(updated.id), (previous) =>
        previous ? { ...previous, ...updated } : updated
      )
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => note.remove(id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useClaimNoteInvitations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: note.claimInvitations,
    onSuccess: async (claimed) => {
      if (claimed > 0) {
        await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      }
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      noteId,
      ...input
    }: {
      noteId: string
      remindAt: string
      repeatInterval: ReminderRepeatInterval
    }) => note.createReminder(noteId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.reminders() })
    },
  })
}

/** Uploads the guest notes kept on this device to the signed-in account and
    then empties the device copy, so they are not uploaded twice. */
export function useImportDeviceNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notes: WorkspaceNote[]) => {
      const created = await note.createMany(
        notes.map((item) => ({
          content: toNoteContent(item.body),
          title: item.title,
        }))
      )

      await saveDeviceNotesWorkspace({
        notes: [],
        openNoteIds: [],
        selectedNoteId: undefined,
      })

      return created.length
    },
    onSuccess: async () => {
      queryClient.setQueryData(noteKeys.device(), [])
      await queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}
