import { insforge } from "@/shared/service/insforge-client"

import type {
  Note,
  NoteAccess,
  NoteAccessRole,
  NoteScope,
  Reminder,
  ReminderRepeatInterval,
  TiptapDoc,
  UpcomingReminder,
} from "../types/note"

export interface NoteCursor {
  updatedAt: string
  id: string
}

export interface ListNotesParams {
  scope: NoteScope
  search?: string
  date?: { year: number; month?: number; day?: number }
  timezone: string
  cursor?: NoteCursor | null
  limit?: number
}

export interface ListNotesResult {
  items: Note[]
  nextCursor: NoteCursor | null
}

export const note = {
  async list({
    scope,
    search,
    date,
    timezone,
    cursor,
    limit = 20,
  }: ListNotesParams): Promise<ListNotesResult> {
    const { data, error } = await insforge.database.rpc("list_notes", {
      p_cursor_id: cursor?.id ?? null,
      p_cursor_updated_at: cursor?.updatedAt ?? null,
      p_day: date?.day ?? null,
      p_limit: limit,
      p_month: date?.month ?? null,
      p_scope: scope,
      p_search: search ?? null,
      p_timezone: timezone,
      p_year: date?.year ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }

    const items = (data ?? []) as Note[]
    const last = items.at(-1)

    return {
      items,
      nextCursor:
        items.length === limit && last
          ? { id: last.id, updatedAt: last.updated_at }
          : null,
    }
  },

  async get(id: string): Promise<Note> {
    const { data, error } = await insforge.database
      .from("notes")
      .select()
      .eq("id", id)
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Nota no encontrada")
    }

    return data as Note
  },

  async create(input: { title: string; content: TiptapDoc }): Promise<Note> {
    const { data, error } = await insforge.database
      .from("notes")
      .insert([input])
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo crear la nota")
    }

    return data as Note
  },

  /** Creates several notes in one request (used to upload a guest's notes). */
  async createMany(
    inputs: { title: string; content: TiptapDoc }[]
  ): Promise<Note[]> {
    if (inputs.length === 0) {
      return []
    }

    const { data, error } = await insforge.database
      .from("notes")
      .insert(inputs)
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as Note[]
  },

  async update(
    id: string,
    input: Partial<{ title: string; content: TiptapDoc }>
  ): Promise<Note> {
    const { data, error } = await insforge.database
      .from("notes")
      .update(input)
      .eq("id", id)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo actualizar la nota")
    }

    return data as Note
  },

  /** Turns pending invitations sent to the signed-in email into access.
      Returns how many were claimed. */
  async claimInvitations(): Promise<number> {
    const { data, error } = await insforge.database.rpc(
      "claim_note_invitations"
    )

    if (error) {
      throw new Error(error.message)
    }

    return typeof data === "number" ? data : 0
  },

  /** Soft delete: the row stays for the owner's history and RLS hides it. */
  async remove(id: string): Promise<void> {
    const { error } = await insforge.database
      .from("notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      throw new Error(error.message)
    }
  },

  async share(
    noteId: string,
    input: { email: string; role: NoteAccessRole }
  ): Promise<{ access: NoteAccess; emailSent: boolean; emailError?: string }> {
    const { data, error } = await insforge.database
      .from("note_accesses")
      .insert([
        { invited_email: input.email, note_id: noteId, role: input.role },
      ])
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo compartir la nota")
    }

    const access = data as NoteAccess

    const { error: inviteError } = await insforge.functions.invoke(
      "notes-share-invite",
      { body: { noteAccessId: access.id } }
    )

    return {
      access,
      emailError: inviteError?.message,
      emailSent: !inviteError,
    }
  },

  async collaborators(noteId: string): Promise<NoteAccess[]> {
    const { data, error } = await insforge.database
      .from("note_accesses")
      .select(
        "id, note_id, user_id, invited_email, role, status, created_at, accepted_at, revoked_at"
      )
      .eq("note_id", noteId)
      .order("created_at")

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []) as NoteAccess[]
  },

  /** The signed-in person's scheduled reminders (RLS limits them to their own
      on notes they can still read), with each note's title. */
  async upcomingReminders(): Promise<UpcomingReminder[]> {
    const { data, error } = await insforge.database
      .from("reminders")
      .select(
        "id, note_id, user_id, remind_at, repeat_interval, status, created_at, completed_at, notes(title)"
      )
      .eq("status", "scheduled")

    if (error) {
      throw new Error(error.message)
    }

    // reminders → notes is many-to-one, so PostgREST embeds a single object;
    // the SDK's inferred type says array, so both shapes are accepted.
    type EmbeddedNote = { title: string } | { title: string }[] | null
    const rows = (data ?? []) as unknown as (Reminder & {
      notes: EmbeddedNote
    })[]

    return rows.map(({ notes, ...reminder }) => ({
      ...reminder,
      note_title: (Array.isArray(notes) ? notes[0]?.title : notes?.title) ?? "",
    }))
  },

  async createReminder(
    noteId: string,
    input: { remindAt: string; repeatInterval: ReminderRepeatInterval }
  ): Promise<Reminder> {
    const { data, error } = await insforge.database
      .from("reminders")
      .insert([
        {
          note_id: noteId,
          remind_at: input.remindAt,
          repeat_interval: input.repeatInterval,
        },
      ])
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo crear el recordatorio")
    }

    return data as Reminder
  },
}
