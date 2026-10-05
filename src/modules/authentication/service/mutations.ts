import type { UserSchema } from "@insforge/sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { isTauri } from "@tauri-apps/api/core"

import { writeGuestMode } from "../lib/guest-mode"
import { writeSessionSnapshot } from "../lib/session-snapshot"
import { signInWithOAuthOnDesktop } from "../lib/tauri-oauth"
import { auth } from "./api"
import type { OAuthProvider } from "./api"
import { authKeys } from "./keys"
import type { Session } from "./queries"

const WEB_OAUTH_REDIRECT_PATH = "/notes"

function setSession(queryClient: QueryClient, session: Session) {
  writeSessionSnapshot(session)
  queryClient.setQueryData<Session>(authKeys.session(), session)
}

/** Everything cached belongs to whoever was signed in before, so it is dropped
    on every identity change instead of leaking into the next session. */
function resetSession(queryClient: QueryClient, session: Session) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== authKeys.all[0],
  })
  setSession(queryClient, session)
}

function signedIn(queryClient: QueryClient, user: UserSchema) {
  writeGuestMode(false)
  resetSession(queryClient, { isGuest: false, user })
}

/**
 * On desktop the whole OAuth round trip happens here and resolves signed in.
 * On the web the browser leaves the app for the provider and the session is
 * picked up by `sessionQueryOptions` when it comes back, so this never
 * resolves with a user there.
 */
export function useSignInWithOAuth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      provider,
      signal,
    }: {
      provider: OAuthProvider
      /** Cancels the desktop wait for the browser to come back. */
      signal?: AbortSignal
    }) => {
      if (isTauri()) {
        const session = await signInWithOAuthOnDesktop(provider, signal)
        return session.user
      }

      await auth.loginWithOAuth(provider, {
        redirectTo: `${window.location.origin}${WEB_OAUTH_REDIRECT_PATH}`,
      })
      return null
    },
    onSuccess: (user) => {
      if (user) {
        signedIn(queryClient, user)
      }
    },
  })
}

export function useContinueAsGuest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      writeGuestMode(true)
      return Promise.resolve()
    },
    onSuccess: () => resetSession(queryClient, { isGuest: true, user: null }),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (session: Session) => {
      writeGuestMode(false)

      if (session.user) {
        await auth.logout()
      }
    },
    onSettled: () => resetSession(queryClient, { isGuest: false, user: null }),
  })
}
