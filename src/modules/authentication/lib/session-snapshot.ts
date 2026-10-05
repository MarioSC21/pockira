import type { Session } from "../service/queries"

// Last known session, so the app can open straight away and confirm it with
// the backend in the background. It only decides which screen to show;
// every backend call still needs the real token held by the SDK.
const SNAPSHOT_KEY = "pockira:session"

export function readSessionSnapshot(): Session | undefined {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as Session) : undefined
  } catch {
    return undefined
  }
}

export function writeSessionSnapshot(session: Session) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(session))
  } catch {
    // Without storage the next launch just waits for the backend.
  }
}
