import { Effect, getCurrentWindow } from "@tauri-apps/api/window"

import { isDesktopApp } from "@/shared/lib/platform"

/**
 * Glass window on the desktop builds: the window itself is created
 * transparent (tauri.conf.json), the system blurs what is behind it and the
 * app paints its theme color over that as a tint (`[data-translucent]` in
 * styles/app.css). The tint never goes away, so the desktop shows through
 * frosted instead of plainly visible. The web and mobile have nothing behind
 * the page to show.
 */
export interface WindowTranslucency {
  enabled: boolean
  /** Percentage of the theme color kept over the blurred desktop. */
  opacity: number
}

export const MIN_WINDOW_OPACITY = 45
export const MAX_WINDOW_OPACITY = 90
const DEFAULT_WINDOW_OPACITY = 70

const ENABLED_KEY = "pockira:window-glass"
const OPACITY_KEY = "pockira:window-opacity"
const PERCENT = 100

// macOS only makes a window transparent through its private API, which the
// build does not enable.
const MAC_USER_AGENT = /Macintosh|Mac OS X/u

export function isWindowTranslucencyAvailable() {
  return isDesktopApp() && !MAC_USER_AGENT.test(navigator.userAgent)
}

function clampOpacity(value: number) {
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value))
}

export function readWindowTranslucency(): WindowTranslucency {
  try {
    const opacity = Number(localStorage.getItem(OPACITY_KEY))

    return {
      enabled: localStorage.getItem(ENABLED_KEY) === "true",
      opacity:
        Number.isFinite(opacity) && opacity > 0
          ? clampOpacity(opacity)
          : DEFAULT_WINDOW_OPACITY,
    }
  } catch {
    return { enabled: false, opacity: DEFAULT_WINDOW_OPACITY }
  }
}

// The effect is only sent when it changes; dragging the slider would
// otherwise call the window on every step.
let appliedBlur = false

async function applyBlur(enabled: boolean) {
  if (enabled === appliedBlur) {
    return
  }

  appliedBlur = enabled

  try {
    const appWindow = getCurrentWindow()

    await (enabled
      ? appWindow.setEffects({ effects: [Effect.Acrylic] })
      : appWindow.clearEffects())
  } catch {
    // Without the effect (Linux) the tint still applies.
  }
}

function applyWindowTranslucency({ enabled, opacity }: WindowTranslucency) {
  if (!isWindowTranslucencyAvailable()) {
    return
  }

  const root = document.documentElement

  root.toggleAttribute("data-translucent", enabled)
  root.style.setProperty("--window-opacity", String(opacity / PERCENT))
  void applyBlur(enabled)
}

export function setWindowTranslucency(translucency: WindowTranslucency) {
  const next = { ...translucency, opacity: clampOpacity(translucency.opacity) }

  try {
    localStorage.setItem(ENABLED_KEY, String(next.enabled))
    localStorage.setItem(OPACITY_KEY, String(next.opacity))
  } catch {
    // It still applies; it just will not survive a restart.
  }

  applyWindowTranslucency(next)
}

/** Applies the stored setting before the first render. */
export function initWindowTranslucency() {
  applyWindowTranslucency(readWindowTranslucency())
}
