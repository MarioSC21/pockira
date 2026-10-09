import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import type { Value } from "platejs"

export interface WorkspaceNoteTag {
  label: string
  icon?: "lock" | "clock"
}

/** A note as the screen works with it, whether it lives on this device or in
    the backend. */
export interface WorkspaceNote {
  id: string
  title: string
  body: Value
  pinned: boolean
  /** When it was created: the date it shows, and the day the calendar and
      the "Hoy" tab file it under. */
  createdAt: Date
  /** Last modification, shown in the note's menu. */
  updatedAt: Date
  /** Drives the "Personales" / "Compartidas" tabs. */
  shared: boolean
  /** Only the owner may delete or share a note; anyone else may only remove
      it from their own notes. */
  isOwner: boolean
  /** False for a note shared as "Puede ver": it opens read-only. */
  canEdit: boolean
  /** Set when it cannot be deleted or removed right now (e.g. offline). */
  deleteDisabledReason?: string
}

export type WorkspaceNotePatch = Partial<Pick<WorkspaceNote, "title" | "body">>

export function formatNoteDate(date: Date) {
  return format(date, "d MMM", { locale: es })
}

export function formatNoteTime(date: Date) {
  return format(date, "h:mmaaa")
}

export function formatNoteDateTime(date: Date) {
  return `${formatNoteDate(date)} · ${formatNoteTime(date)}`
}

/** Compact date for dense lists: the time for today, "ayer", else the day. */
export function formatNoteShortDate(date: Date) {
  if (isToday(date)) {
    return formatNoteTime(date)
  }

  return isYesterday(date) ? "ayer" : formatNoteDate(date)
}

/** Badges shown on the list card and in the editor header. */
export function noteTags(note: WorkspaceNote): WorkspaceNoteTag[] {
  return [
    {
      icon: note.shared ? undefined : "lock",
      label: formatNoteDate(note.createdAt),
    },
    { icon: "clock", label: formatNoteTime(note.createdAt) },
  ]
}
