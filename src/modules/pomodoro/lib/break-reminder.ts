import { invoke } from "@tauri-apps/api/core"

import { playPomodoroChime } from "@/modules/pomodoro/lib/pomodoro-sound"
import {
  getPomodoroState,
  grabWindowAttention,
  selectPomodoroMode,
  startPomodoro,
} from "@/modules/pomodoro/lib/pomodoro-store"
import { isDesktopApp } from "@/shared/lib/platform"

export interface BreakReminderSettings {
  enabled: boolean
  /** Minutes of continuous use before the reminder shows. */
  everyMinutes: number
}

export interface BreakReminderState {
  settings: BreakReminderSettings
  isAlertOpen: boolean
}

interface ActivityInfo {
  idleMs: number
  uptimeMs: number
}

export const DEFAULT_BREAK_REMINDER: BreakReminderSettings = {
  enabled: true,
  everyMinutes: 60,
}

const STORAGE_KEY = "pockira:break-reminder"
const MINUTE_MS = 60_000
const CHECK_EVERY_MS = 30_000
// This long without touching keyboard or mouse counts as a break: the clock
// of continuous use starts over when the user comes back.
const AWAY_MS = 5 * MINUTE_MS
const SNOOZE_MS = 10 * MINUTE_MS

function loadSettings(): BreakReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? { ...DEFAULT_BREAK_REMINDER, ...JSON.parse(raw) }
      : DEFAULT_BREAK_REMINDER
  } catch {
    return DEFAULT_BREAK_REMINDER
  }
}

let state: BreakReminderState = {
  isAlertOpen: false,
  settings: loadSettings(),
}
const listeners = new Set<() => void>()

/** When the current stretch of continuous use began; null until the first
    check, which can date it back to when the PC was turned on. */
let usingSince: number | null = null
let snoozedUntil = 0

function setState(next: BreakReminderState) {
  state = next
  for (const listener of listeners) {
    listener()
  }
}

export function getBreakReminderState() {
  return state
}

export function subscribeBreakReminder(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function updateBreakReminderSettings(settings: BreakReminderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Applies for this run only.
  }
  setState({ ...state, settings })
}

function closeAlert() {
  setState({ ...state, isAlertOpen: false })
}

/** "Ya descansé": the count of continuous use starts over. */
export function finishBreakReminder() {
  usingSince = Date.now()
  closeAlert()
}

export function snoozeBreakReminder() {
  snoozedUntil = Date.now() + SNOOZE_MS
  closeAlert()
}

/** Takes the break with the pomodoro's short-break timer. */
export function startBreakFromReminder() {
  selectPomodoroMode("shortBreak")
  startPomodoro()
  finishBreakReminder()
}

function isOnPomodoroBreak() {
  const pomodoro = getPomodoroState()
  return pomodoro.mode !== "focus" && pomodoro.status === "running"
}

async function readActivity() {
  try {
    return await invoke<ActivityInfo | null>("activity_info")
  } catch {
    return null
  }
}

async function check() {
  const activity = await readActivity()

  if (!activity) {
    return
  }

  const now = Date.now()
  const everyMs = state.settings.everyMinutes * MINUTE_MS

  if (usingSince === null) {
    // PC turned on recently: count from then (6 pm on, reminder at 7 pm even
    // if the app opened later). A long uptime is most likely Windows' Fast
    // Startup, which hibernates instead of shutting down, so it is ignored.
    usingSince =
      activity.uptimeMs < everyMs
        ? now - activity.uptimeMs
        : now - activity.idleMs
  }

  if (activity.idleMs >= AWAY_MS || isOnPomodoroBreak()) {
    // Away (or on a pomodoro break): that is the rest the reminder asks for.
    usingSince = now
    if (state.isAlertOpen) {
      closeAlert()
    }
    return
  }

  const shouldRemind =
    state.settings.enabled &&
    !state.isAlertOpen &&
    now >= snoozedUntil &&
    now - usingSince >= everyMs

  if (shouldRemind) {
    setState({ ...state, isAlertOpen: true })
    void grabWindowAttention()
    if (getPomodoroState().settings.sound) {
      void playPomodoroChime("shortBreak")
    }
  }
}

// Desktop only: it needs the system-wide idle time from Windows.
if (isDesktopApp()) {
  void check()
  setInterval(() => {
    void check()
  }, CHECK_EVERY_MS)
}
