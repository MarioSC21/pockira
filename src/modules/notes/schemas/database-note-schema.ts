import { z } from "zod"

export const databaseNoteSchema = z.object({
  content: z.unknown(),
  id: z.uuid(),
  owner_id: z.uuid(),
  title: z.string(),
  updated_at: z.string(),
})

export const databaseNotesSchema = z.array(databaseNoteSchema)

export type DatabaseNote = z.infer<typeof databaseNoteSchema>
