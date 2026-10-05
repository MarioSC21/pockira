import { Schedule } from "@tauri-apps/plugin-notification"
import { format } from "date-fns"

import { isMobileApp } from "@/shared/lib/platform"
import {
  cancelScheduledNotifications,
  ensureNotificationPermission,
  scheduleSystemNotification,
  showSystemNotification,
} from "@/shared/service/system-notifications"

export type PomodoroMode = "focus" | "shortBreak" | "longBreak"
export type PomodoroStatus = "idle" | "running" | "paused"

export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  /** Focus sessions before a long break. */
  longBreakEvery: number
}

export interface PomodoroState {
  mode: PomodoroMode
  status: PomodoroStatus
  /** When the running phase ends (epoch ms); null unless running. */
  endsAt: number | null
  /** Time left in the phase; authoritative while idle or paused. */
  remainingMs: number
  /** Focus sessions finished in the current cycle (resets on long break). */
  cycleCount: number
  /** Focus sessions finished today, for the counter. */
  today: { date: string; count: number }
  settings: PomodoroSettings
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  longBreakEvery: 4,
  longBreakMinutes: 15,
  shortBreakMinutes: 5,
}

const STORAGE_KEY = "pockira:pomodoro"
// Fixed id of the one pending pomodoro notification on mobile.
const NOTIFICATION_ID = 7_000_001
const NOTIFICATION_TITLE = "Pomodoro"

const MINUTE_MS = 60_000

function todayKey() {
  return format(new Date(), "yyyy-MM-dd")
}

export function phaseDurationMs(
  mode: PomodoroMode,
  settings: PomodoroSettings
) {
  const minutes = {
    focus: settings.focusMinutes,
    longBreak: settings.longBreakMinutes,
    shortBreak: settings.shortBreakMinutes,
  }[mode]

  return minutes * MINUTE_MS
}

function initialState(): PomodoroState {
  return {
    cycleCount: 0,
    endsAt: null,
    mode: "focus",
    remainingMs: phaseDurationMs("focus", DEFAULT_SETTINGS),
    settings: DEFAULT_SETTINGS,
    status: "idle",
    today: { count: 0, date: todayKey() },
  }
}

function load(): PomodoroState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return initialState()
    }

    const stored = JSON.parse(raw) as PomodoroState
    const settings = { ...DEFAULT_SETTINGS, ...stored.settings }

    return {
      ...initialState(),
      ...stored,
      settings,
      today:
        stored.today?.date === todayKey()
          ? stored.today
          : { count: 0, date: todayKey() },
    }
  } catch {
    return initialState()
  }
}

let state = load()
const listeners = new Set<() => void>()
let phaseTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The timer keeps working; it just will not survive a restart.
  }
}

function setState(next: PomodoroState) {
  state = next
  persist()
  for (const listener of listeners) {
    listener()
  }
}

export function getPomodoroState() {
  return state
}

export function subscribePomodoro(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function completionMessage(mode: PomodoroMode, settings: PomodoroSettings) {
  if (mode === "focus") {
    return "¡Pomodoro completado! Tómate un descanso."
  }

  return `Descanso terminado. ¡A enfocarte ${settings.focusMinutes} minutos!`
}

function cancelMobileNotification() {
  if (isMobileApp()) {
    void cancelScheduledNotifications(
      (notification) => notification.id === NOTIFICATION_ID
    )
  }
}

/** Mobile hands the end-of-phase notification to the OS so it rings with
    the app closed; desktop and web ring it from `complete` instead. */
function scheduleMobileNotification(endsAt: number) {
  if (isMobileApp()) {
    void scheduleSystemNotification({
      body: completionMessage(state.mode, state.settings),
      id: NOTIFICATION_ID,
      schedule: Schedule.at(new Date(endsAt), false, true),
      title: NOTIFICATION_TITLE,
    })
  }
}

function armTimer() {
  clearTimeout(phaseTimer)

  if (state.status === "running" && state.endsAt) {
    phaseTimer = setTimeout(
      () => complete(true),
      Math.max(0, state.endsAt - Date.now())
    )
  }
}

function nextMode(): { mode: PomodoroMode; cycleCount: number } {
  if (state.mode !== "focus") {
    return { cycleCount: state.cycleCount, mode: "focus" }
  }

  const cycleCount = state.cycleCount + 1

  return cycleCount >= state.settings.longBreakEvery
    ? { cycleCount: 0, mode: "longBreak" }
    : { cycleCount, mode: "shortBreak" }
}

/** Ends the current phase and readies the next one (not started). */
function complete(notify: boolean) {
  clearTimeout(phaseTimer)

  if (notify && !isMobileApp()) {
    void showSystemNotification(
      NOTIFICATION_TITLE,
      completionMessage(state.mode, state.settings)
    )
  }

  const finishedFocus = state.mode === "focus"
  const today =
    state.today.date === todayKey()
      ? state.today
      : { count: 0, date: todayKey() }
  const { mode, cycleCount } = nextMode()

  setState({
    ...state,
    cycleCount,
    endsAt: null,
    mode,
    remainingMs: phaseDurationMs(mode, state.settings),
    status: "idle",
    today: finishedFocus ? { ...today, count: today.count + 1 } : today,
  })
}

/** Asks for permission (on the click, so the system prompt has a clear
    reason) and then hands the end notification to the OS on mobile. */
async function prepareNotification(endsAt: number) {
  await ensureNotificationPermission().catch(() => false)

  // Paused or reset while the prompt was open: nothing to schedule.
  if (state.status === "running" && state.endsAt === endsAt) {
    scheduleMobileNotification(endsAt)
  }
}

export function startPomodoro() {
  if (state.status === "running") {
    return
  }

  // The timer starts at once; it never waits for the permission prompt.
  const endsAt = Date.now() + state.remainingMs
  setState({ ...state, endsAt, status: "running" })
  armTimer()
  void prepareNotification(endsAt)
}

export function pausePomodoro() {
  if (state.status !== "running" || !state.endsAt) {
    return
  }

  clearTimeout(phaseTimer)
  cancelMobileNotification()
  setState({
    ...state,
    endsAt: null,
    remainingMs: Math.max(0, state.endsAt - Date.now()),
    status: "paused",
  })
}

/** Back to the full length of the current phase, stopped. */
export function resetPomodoro() {
  clearTimeout(phaseTimer)
  cancelMobileNotification()
  setState({
    ...state,
    endsAt: null,
    remainingMs: phaseDurationMs(state.mode, state.settings),
    status: "idle",
  })
}

/** Jumps to the next phase without counting the current one. */
export function skipPomodoroPhase() {
  clearTimeout(phaseTimer)
  cancelMobileNotification()
  const { mode, cycleCount } = nextMode()

  setState({
    ...state,
    cycleCount: state.mode === "focus" ? state.cycleCount : cycleCount,
    endsAt: null,
    mode,
    remainingMs: phaseDurationMs(mode, state.settings),
    status: "idle",
  })
}

/** Picks a phase by hand (the mode tabs). */
export function selectPomodoroMode(mode: PomodoroMode) {
  clearTimeout(phaseTimer)
  cancelMobileNotification()
  setState({
    ...state,
    endsAt: null,
    mode,
    remainingMs: phaseDurationMs(mode, state.settings),
    status: "idle",
  })
}

export function updatePomodoroSettings(settings: PomodoroSettings) {
  const isStopped = state.status === "idle"

  setState({
    ...state,
    // A running or paused phase keeps its time; the new lengths apply from
    // the next phase on.
    remainingMs: isStopped
      ? phaseDurationMs(state.mode, settings)
      : state.remainingMs,
    settings,
  })
}

// A phase that ended while the app was closed is completed on load (mobile
// already notified through the OS); one still in progress resumes.
if (state.status === "running" && state.endsAt) {
  if (state.endsAt <= Date.now()) {
    complete(false)
  } else {
    armTimer()
  }
}
