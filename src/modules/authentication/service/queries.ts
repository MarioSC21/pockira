import type { UserSchema } from "@insforge/sdk"
import { queryOptions, useQuery } from "@tanstack/react-query"

import { hasPendingOAuthCallback } from "@/shared/service/insforge-client"

import { readGuestMode, writeGuestMode } from "../lib/guest-mode"
import {
  readSessionSnapshot,
  writeSessionSnapshot,
} from "../lib/session-snapshot"
import { auth } from "./api"
import { authKeys } from "./keys"

export interface Session {
  user: UserSchema | null
  /** The person chose to use the app without an account on this device. */
  isGuest: boolean
}

// Long enough not to re-ask the backend on every screen change.
const SESSION_STALE_MS = 5 * 60 * 1000

export const sessionQueryOptions = () =>
  queryOptions({
    // The last known session lets the route guards pass at once instead of
    // leaving the window blank while the backend answers. It is marked as
    // already stale, so the first screen that reads it confirms it in the
    // background (see ProtectedRoute for what happens if it was revoked).
    // Back from a web OAuth redirect the snapshot still says signed out, so
    // the guards wait for the code exchange instead.
    initialData: hasPendingOAuthCallback ? undefined : readSessionSnapshot,
    initialDataUpdatedAt: 0,
    queryFn: async (): Promise<Session> => {
      const user = await auth.currentUser()

      // A real session always wins over a leftover guest choice.
      if (user) {
        writeGuestMode(false)
      }

      const session = { isGuest: !user && readGuestMode(), user }
      writeSessionSnapshot(session)
      return session
    },
    queryKey: authKeys.session(),
    staleTime: SESSION_STALE_MS,
  })

export const useSession = () => useQuery(sessionQueryOptions())
