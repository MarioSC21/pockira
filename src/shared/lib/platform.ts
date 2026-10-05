import { isTauri } from "@tauri-apps/api/core"

const MOBILE_USER_AGENT = /Android|iPhone|iPad/iu

/** The Tauri app on Windows, macOS or Linux. */
export function isDesktopApp() {
  return isTauri() && !MOBILE_USER_AGENT.test(navigator.userAgent)
}

/** The Tauri app on Android or iOS. */
export function isMobileApp() {
  return isTauri() && MOBILE_USER_AGENT.test(navigator.userAgent)
}
