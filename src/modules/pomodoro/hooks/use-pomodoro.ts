import { useEffect, useState, useSyncExternalStore } from "react"

import {
  getPomodoroState,
  phaseDurationMs,
  subscribePomodoro,
} from "@/modules/pomodoro/lib/pomodoro-store"

// Fast enough that the seconds never visibly skip.
const TICK_MS = 250

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** The pomodoro state plus the live time left, re-rendering while running. */
export function usePomodoro() {
  const state = useSyncExternalStore(subscribePomodoro, getPomodoroState)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (state.status !== "running") {
      return
    }

    const interval = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(interval)
  }, [state.status])

  // `now` only advances on the ticks, so right after "Iniciar" it can still be
  // the time the screen mounted, which made the ring jump backwards. While
  // running, `remainingMs` holds the time left when it started, so clamping
  // to it keeps a stale `now` from ever showing more than that.
  const remainingMs =
    state.status === "running" && state.endsAt
      ? clamp(state.endsAt - now, 0, state.remainingMs)
      : state.remainingMs
  const totalMs = phaseDurationMs(state.mode, state.settings)

  return {
    ...state,
    progress: totalMs > 0 ? clamp(1 - remainingMs / totalMs, 0, 1) : 0,
    remainingMs,
  }
}
