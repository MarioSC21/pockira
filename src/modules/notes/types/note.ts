export type NoteSort = "title" | "updated"
export type NoteView = "all" | "personal" | "shared"
export type NoteVisibility = "personal" | "shared"

export interface Note {
  content: string
  excerpt: string
  id: string
  title: string
  updatedAt: string
  visibility: NoteVisibility
}

export interface NotesQuery {
  page: number
  query: string
  sort: NoteSort
  view: NoteView
}

export interface NotesResult {
  notes: readonly Note[]
  pageCount: number
  total: number
}
