import { Effect, getCurrentWindow } from "@tauri-apps/api/window"

import { isDesktopApp } from "@/shared/lib/platform"

/**
 * See-through window on the desktop builds: the window itself is created
 * transparent (tauri.conf.json) and the app paints its background at the
 * chosen opacity (`[data-translucent]` in styles/app.css), optionally with
 * the system blur behind it. The web and mobile have nothing behind the page
 * to show.
 */
export interface WindowTranslucency {
  /** Percentage of the background that stays; 100 is a solid window. */
  opacity: number
  /** Blurs what is behind the window (Windows). */
  blur: boolean
}

export const MIN_WINDOW_OPACITY = 30
export const MAX_WINDOW_OPACITY = 100

const OPACITY_KEY = "pockira:window-opacity"
const BLUR_KEY = "pockira:window-blur"
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
      blur: localStorage.getItem(BLUR_KEY) === "true",
      opacity:
        Number.isFinite(opacity) && opacity > 0
          ? clampOpacity(opacity)
          : MAX_WINDOW_OPACITY,
    }
  } catch {
    return { blur: false, opacity: MAX_WINDOW_OPACITY }
  }
}

// The effect is only sent when it changes; dragging the opacity slider would
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
    // Without the effect (Linux) the opacity still applies.
  }
}

function applyWindowTranslucency({ blur, opacity }: WindowTranslucency) {
  if (!isWindowTranslucencyAvailable()) {
    return
  }

  const root = document.documentElement
  const isTranslucent = opacity < MAX_WINDOW_OPACITY

  root.toggleAttribute("data-translucent", isTranslucent)
  root.style.setProperty("--window-opacity", String(opacity / PERCENT))
  void applyBlur(isTranslucent && blur)
}

export function setWindowTranslucency(translucency: WindowTranslucency) {
  const next = { ...translucency, opacity: clampOpacity(translucency.opacity) }

  try {
    localStorage.setItem(OPACITY_KEY, String(next.opacity))
    localStorage.setItem(BLUR_KEY, String(next.blur))
  } catch {
    // It still applies; it just will not survive a restart.
  }

  applyWindowTranslucency(next)
}

/** Applies the stored translucency before the first render. */
export function initWindowTranslucency() {
  applyWindowTranslucency(readWindowTranslucency())
}
