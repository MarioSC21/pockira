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
