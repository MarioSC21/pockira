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
  tags: DemoNoteTag[]
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

export const demoNotes: DemoNote[] = [
  {
    id: "habit-tracker",
    title: "Habit tracker semana 34",
    body: habitTrackerBody,
    pinned: true,
    tags: [{ label: "22 ago" }, { label: "9:00am", icon: "clock" }],
  },
  {
    id: "ideas-finde",
    title: "Ideas para el finde",
    body: textNote("Spiderman, hilo impresora 3d, receta de mi hermana..."),
    pinned: true,
    tags: [{ label: "24 ago", icon: "lock" }],
  },
  {
    id: "reunion-bolha",
    title: "Notas · reunión bolha tec",
    body: textNote("review meeting con bolha dev · hbi-plan code review"),
    pinned: true,
    tags: [{ label: "21 ago", icon: "lock" }],
  },
  {
    id: "compras-mes",
    title: "Compras del mes",
    body: textNote("filamento 3d, snacks, velas de cumpleaños..."),
    pinned: true,
    tags: [{ label: "30 ago", icon: "lock" }],
  },
]
