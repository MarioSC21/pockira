import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Value } from "platejs"

export interface DemoNoteTag {
  label: string
  icon?: "lock" | "clock"
}

export interface DemoNote {
  id: string
  title: string
  body: Value
  pinned: boolean
  /** Day the note belongs to: what the calendar and the "Hoy" tab filter on. */
  createdAt: Date
  /** Until the backend lands this is local-only, but it already drives the
      "Personales" / "Compartidas" tabs. */
  shared: boolean
}

export function formatNoteDate(date: Date) {
  return format(date, "d MMM", { locale: es })
}

export function formatNoteTime(date: Date) {
  return format(date, "h:mmaaa")
}

/** Badges shown on the list card and in the editor header. */
export function noteTags(note: DemoNote): DemoNoteTag[] {
  return [
    {
      icon: note.shared ? undefined : "lock",
      label: formatNoteDate(note.createdAt),
    },
    { icon: "clock", label: formatNoteTime(note.createdAt) },
  ]
}

function paragraph(text: string): Value[number] {
  return { children: [{ text }], type: "p" }
}

function todoItem(text: string, checked: boolean, indent = 1): Value[number] {
  return {
    checked,
    children: [{ text }],
    indent,
    listStyleType: "todo",
    type: "p",
  }
}

const habitTrackerBody: Value = [
  paragraph(
    "Plan de la semana para retomar hábitos y avanzar con la impresora 3d. Voy a intentar no dejar todo para el último día como la vez pasada."
  ),
  { children: [{ text: "Tareas" }], type: "h3" },
  todoItem("Preparar impresora 3d", false),
  todoItem("Review meeting con bolha dev", true),
  todoItem("Backup de videos", false),
  todoItem("Revisar plan de hábitos", true),
  todoItem("Enviar invites", false, 2),
]

function textNote(text: string): Value {
  return [paragraph(text)]
}

/** Demo dates are relative to the current day so the calendar and the "Hoy"
    tab have something to show whenever the app runs. */
function demoDate(dayOffset: number, hours: number, minutes: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const demoNotes: DemoNote[] = [
  {
    id: "habit-tracker",
    title: "Habit tracker semana 34",
    body: habitTrackerBody,
    pinned: true,
    createdAt: demoDate(0, 9, 0),
    shared: true,
  },
  {
    id: "ideas-finde",
    title: "Ideas para el finde",
    body: textNote("Spiderman, hilo impresora 3d, receta de mi hermana..."),
    pinned: true,
    createdAt: demoDate(0, 15, 40),
    shared: false,
  },
  {
    id: "reunion-bolha",
    title: "Notas · reunión bolha tec",
    body: textNote("review meeting con bolha dev · hbi-plan code review"),
    pinned: false,
    createdAt: demoDate(-1, 11, 30),
    shared: true,
  },
  {
    id: "compras-mes",
    title: "Compras del mes",
    body: textNote("filamento 3d, snacks, velas de cumpleaños..."),
    pinned: false,
    createdAt: demoDate(2, 18, 15),
    shared: false,
  },
]
