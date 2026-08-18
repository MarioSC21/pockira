import { insforge } from "@/shared/service/insforge-client"

import {
  databaseNoteSchema,
  databaseNotesSchema,
} from "../schemas/database-note-schema"
import type { DatabaseNote } from "../schemas/database-note-schema"
import type { Note, NotesQuery, NotesResult } from "../types/note"

const NOTES_PER_PAGE = 4
const EMPTY_NOTES_RESULT: NotesResult = {
  notes: [],
  pageCount: 1,
  total: 0,
}

const getContentText = (value: unknown): string => {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(getContentText).filter(Boolean).join(" ")
  }

  if (typeof value !== "object" || value === null) {
    return ""
  }

  const record = value as Record<string, unknown>
  const nodeText = typeof record.text === "string" ? record.text : ""
  const childText = getContentText(record.content)

  return [nodeText, childText].filter(Boolean).join(" ")
}

const createExcerpt = (content: string): string => {
  const normalizedContent = content.split(/\s+/u).join(" ").trim()

  if (!normalizedContent) {
    return "This note does not have any text yet."
  }

  const excerpt = normalizedContent.slice(0, 140)

  return normalizedContent.length > excerpt.length ? `${excerpt}…` : excerpt
}

const mapDatabaseNote = (note: DatabaseNote, userId: string): Note => {
  const content = getContentText(note.content)

  return {
    content,
    excerpt: createExcerpt(content),
    id: note.id,
    title: note.title,
    updatedAt: note.updated_at,
    visibility: note.owner_id === userId ? "personal" : "shared",
  }
}

const getCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await insforge.auth.getCurrentUser()

  if (error) {
    throw new Error(`Unable to restore the InsForge session: ${error.message}`)
  }

  return data?.user?.id ?? null
}

export const getNoteById = async (noteId: string): Promise<Note> => {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new Error("Sign in before opening a note.")
  }

  const { data, error } = await insforge.database
    .from("notes")
    .select("id, owner_id, title, content, updated_at")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load the note: ${error.message}`)
  }

  if (!data) {
    throw new Error(`No accessible note exists with the id “${noteId}”.`)
  }

  return mapDatabaseNote(databaseNoteSchema.parse(data), userId)
}

export const getNotes = async ({
  page,
  query,
  sort,
  view,
}: NotesQuery): Promise<NotesResult> => {
  const userId = await getCurrentUserId()

  if (!userId) {
    return EMPTY_NOTES_RESULT
  }

  const pageStart = (page - 1) * NOTES_PER_PAGE
  let databaseQuery = insforge.database
    .from("notes")
    .select("id, owner_id, title, content, updated_at", { count: "exact" })
    .is("deleted_at", null)

  const normalizedQuery = query.trim()

  if (normalizedQuery) {
    databaseQuery = databaseQuery.ilike("title", `%${normalizedQuery}%`)
  }

  if (view === "personal") {
    databaseQuery = databaseQuery.eq("owner_id", userId)
  } else if (view === "shared") {
    databaseQuery = databaseQuery.neq("owner_id", userId)
  }

  databaseQuery =
    sort === "title"
      ? databaseQuery.order("title", { ascending: true })
      : databaseQuery.order("updated_at", { ascending: false })

  const { count, data, error } = await databaseQuery.range(
    pageStart,
    pageStart + NOTES_PER_PAGE - 1
  )

  if (error) {
    throw new Error(`Unable to load notes: ${error.message}`)
  }

  const notes = databaseNotesSchema
    .parse(data ?? [])
    .map((note) => mapDatabaseNote(note, userId))
  const total = count ?? notes.length

  return {
    notes,
    pageCount: Math.max(1, Math.ceil(total / NOTES_PER_PAGE)),
    total,
  }
}
