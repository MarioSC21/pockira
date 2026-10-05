import { isSameDay, isToday } from "date-fns"

import { extractText } from "@/modules/notes/lib/note-body"
import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"

// "Hoy" is just the day filter pointing at today, so pressing the tab and
// picking today on the calendar land on the same state.
export type NoteFilter =
  | { kind: "day"; date: Date }
  | { kind: "all" }
  | { kind: "personal" }
  | { kind: "shared" }

export type NoteFilterTab = "hoy" | "todas" | "personales" | "compartidas"

export const ALL_NOTES_FILTER: NoteFilter = { kind: "all" }

/** The active tab, or null when the calendar points at a day other than today
    (no tab represents that state). */
export function filterToTab(filter: NoteFilter): NoteFilterTab | null {
  switch (filter.kind) {
    case "day": {
      return isToday(filter.date) ? "hoy" : null
    }
    case "personal": {
      return "personales"
    }
    case "shared": {
      return "compartidas"
    }
    default: {
      return "todas"
    }
  }
}

export function tabToFilter(tab: NoteFilterTab): NoteFilter {
  switch (tab) {
    case "hoy": {
      return { date: new Date(), kind: "day" }
    }
    case "personales": {
      return { kind: "personal" }
    }
    case "compartidas": {
      return { kind: "shared" }
    }
    default: {
      return ALL_NOTES_FILTER
    }
  }
}

function matchesFilter(note: WorkspaceNote, filter: NoteFilter) {
  switch (filter.kind) {
    case "day": {
      return isSameDay(note.createdAt, filter.date)
    }
    case "personal": {
      return !note.shared
    }
    case "shared": {
      return note.shared
    }
    default: {
      return true
    }
  }
}

function matchesSearch(note: WorkspaceNote, search: string) {
  const needle = search.trim().toLowerCase()

  if (!needle) {
    return true
  }

  const haystack = `${note.title} ${extractText(note.body)}`.toLowerCase()

  return haystack.includes(needle)
}

export function filterNotes(
  notes: WorkspaceNote[],
  filter: NoteFilter,
  search: string
) {
  return notes.filter(
    (note) => matchesFilter(note, filter) && matchesSearch(note, search)
  )
}

export function describeEmptyList(filter: NoteFilter, search: string) {
  if (search.trim()) {
    return "No hay notas que coincidan con la búsqueda."
  }

  switch (filter.kind) {
    case "day": {
      return isToday(filter.date)
        ? "No hay notas de hoy."
        : "No hay notas de este día."
    }
    case "personal": {
      return "No hay notas personales."
    }
    case "shared": {
      return "No hay notas compartidas."
    }
    default: {
      return "Todavía no hay notas."
    }
  }
}
