import { isDesktopApp } from "@/shared/lib/platform"

/**
 * The desktop builds draw their own title bar (the native one is turned off
 * in tauri.conf.json). Mobile Tauri builds and the web keep the system chrome.
 */
export function hasCustomTitlebar() {
  return isDesktopApp()
}

/** Flags the document so `--titlebar-height` reserves room for the bar
    before the first paint. */
export function applyWindowChrome() {
  if (hasCustomTitlebar()) {
    document.documentElement.dataset.titlebar = "custom"
  }
}
