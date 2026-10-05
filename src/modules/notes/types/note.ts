export interface TiptapDoc {
  type: "doc"
  content?: unknown[]
}

export interface Note {
  id: string
  owner_id: string
  title: string
  content: TiptapDoc
  created_at: string
  updated_at: string
  /** Computed by list_notes; a plain row read from the table lacks them. */
  is_owner?: boolean
  is_shared?: boolean
}

export type NoteScope = "all" | "personal" | "shared"

export type NoteAccessRole = "editor" | "reader"
export type NoteAccessStatus = "pending" | "accepted" | "revoked"

export interface NoteAccess {
  id: string
  note_id: string
  user_id: string | null
  invited_email: string
  role: NoteAccessRole
  status: NoteAccessStatus
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export type ReminderRepeatInterval = "none" | "daily" | "weekly" | "monthly"
export type ReminderStatus = "scheduled" | "completed" | "cancelled"

export interface Reminder {
  id: string
  note_id: string
  user_id: string
  remind_at: string
  repeat_interval: ReminderRepeatInterval
  status: ReminderStatus
  created_at: string
  completed_at: string | null
}

/** A scheduled reminder plus the title of its note, for notifications. */
export interface UpcomingReminder extends Reminder {
  note_title: string
}
