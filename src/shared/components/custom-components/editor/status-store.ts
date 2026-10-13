import { useSyncExternalStore } from "react"

/**
 * The statuses a person can tag a line with (a name and a color each). The
 * tag written in a note carries its own name and color, so a note reads the
 * same anywhere; this list is only what the menus offer on this device. It
 * starts with three and grows with the ones the person creates and with any
 * status found in a note they open (one created on another device).
 */
export const STATUS_COLORS = [
  { id: "gray", label: "Gris", value: "oklch(0.65 0.02 260)" },
  { id: "red", label: "Rojo", value: "oklch(0.66 0.2 25)" },
  { id: "orange", label: "Naranja", value: "oklch(0.72 0.17 55)" },
  { id: "yellow", label: "Amarillo", value: "oklch(0.78 0.16 90)" },
  { id: "green", label: "Verde", value: "oklch(0.72 0.19 148)" },
  { id: "teal", label: "Turquesa", value: "oklch(0.72 0.13 195)" },
  { id: "blue", label: "Azul", value: "oklch(0.68 0.16 250)" },
  { id: "purple", label: "Morado", value: "oklch(0.68 0.18 300)" },
  { id: "pink", label: "Rosa", value: "oklch(0.72 0.18 350)" },
] as const

export type StatusColorId = (typeof STATUS_COLORS)[number]["id"]

export interface NoteStatus {
  name: string
  color: StatusColorId
}

interface StoredStatuses {
  statuses: NoteStatus[]
  /** Names deleted from the list, so opening an old note does not bring
      them back. */
  removed: string[]
}

const STORAGE_KEY = "pockira:statuses"
export const MAX_STATUS_NAME_LENGTH = 24

const DEFAULT_STATUSES: NoteStatus[] = [
  { color: "gray", name: "Pendiente" },
  { color: "yellow", name: "En progreso" },
  { color: "green", name: "Listo" },
]

export function isStatusColorId(value: unknown): value is StatusColorId {
  return STATUS_COLORS.some((color) => color.id === value)
}

export function statusColorValue(color: unknown) {
  return (
    STATUS_COLORS.find((item) => item.id === color)?.value ??
    STATUS_COLORS[0].value
  )
}

const keyOf = (name: string) => name.trim().toLowerCase()

function isNoteStatus(value: unknown): value is NoteStatus {
  const status = value as Partial<NoteStatus> | null

  return (
    typeof status?.name === "string" &&
    status.name.trim() !== "" &&
    isStatusColorId(status.color)
  )
}

function load(): StoredStatuses {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as Partial<StoredStatuses>) : null

    if (stored && Array.isArray(stored.statuses)) {
      return {
        removed: Array.isArray(stored.removed)
          ? stored.removed.filter((name) => typeof name === "string")
          : [],
        statuses: stored.statuses.filter(isNoteStatus),
      }
    }
  } catch {
    // An unreadable list starts over from the defaults.
  }

  return { removed: [], statuses: DEFAULT_STATUSES }
}

let state = load()
const listeners = new Set<() => void>()

function update(next: StoredStatuses) {
  state = next

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The list still works; it just will not survive a restart.
  }

  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getStatuses = () => state.statuses

export function useStatuses() {
  return useSyncExternalStore(subscribe, getStatuses)
}

/** Adds the status, or changes the color of the one with that name. */
export function saveStatus(status: NoteStatus) {
  const name = status.name.trim().slice(0, MAX_STATUS_NAME_LENGTH)

  if (!name) {
    return
  }

  const next = { color: status.color, name }
  const exists = state.statuses.some((item) => keyOf(item.name) === keyOf(name))

  update({
    removed: state.removed.filter((removed) => removed !== keyOf(name)),
    statuses: exists
      ? state.statuses.map((item) =>
          keyOf(item.name) === keyOf(name) ? next : item
        )
      : [...state.statuses, next],
  })
}

export function removeStatus(name: string) {
  update({
    removed: [...new Set([...state.removed, keyOf(name)])],
    statuses: state.statuses.filter((item) => keyOf(item.name) !== keyOf(name)),
  })
}

/** A status seen in a note joins the list unless it is there or was deleted. */
export function rememberStatus(status: unknown) {
  if (!isNoteStatus(status)) {
    return
  }

  const key = keyOf(status.name)

  if (
    state.removed.includes(key) ||
    state.statuses.some((item) => keyOf(item.name) === key)
  ) {
    return
  }

  update({
    ...state,
    statuses: [...state.statuses, { color: status.color, name: status.name }],
  })
}
