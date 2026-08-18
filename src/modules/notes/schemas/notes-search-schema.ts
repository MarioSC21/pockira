import { z } from "zod"

export const notesSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  query: z.string().trim().max(80).default(""),
  sort: z.enum(["updated", "title"]).default("updated"),
  view: z.enum(["all", "personal", "shared"]).default("all"),
})

export type NotesSearch = z.infer<typeof notesSearchSchema>
