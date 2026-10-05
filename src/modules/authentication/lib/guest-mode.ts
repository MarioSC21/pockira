// Guest mode is a choice made on this device only, so it lives in the webview's
// storage instead of the backend. localStorage exists on every target (web,
// desktop and Android all run in a webview).
const GUEST_MODE_KEY = "pockira:guest-mode"

export function readGuestMode() {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeGuestMode(isGuest: boolean) {
  try {
    if (isGuest) {
      localStorage.setItem(GUEST_MODE_KEY, "1")
    } else {
      localStorage.removeItem(GUEST_MODE_KEY)
    }
  } catch {
    // Blocked storage only means the choice is not remembered next launch.
  }
}
