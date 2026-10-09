import { createClient } from "@insforge/sdk"

/** True when the page was opened by a web OAuth redirect. Read before
    `createClient`, which strips `insforge_code` from the URL as it starts
    exchanging it for a session. */
export const hasPendingOAuthCallback =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("insforge_code")

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
})

let sessionRestore: Promise<boolean> | null = null

/** After a restart the SDK holds no access token until `getCurrentUser()`
    refreshes it, and a request sent before that goes out with the project
    key alone instead of as the signed-in person. Backend calls await this
    first. A run that found no user is not kept, so a later call (back
    online, or after signing in) tries again. */
export async function whenSessionRestored() {
  sessionRestore ??= (async () => {
    try {
      const { data } = await insforge.auth.getCurrentUser()
      return Boolean(data?.user)
    } catch {
      return false
    }
  })()

  if (!(await sessionRestore)) {
    sessionRestore = null
  }
}
