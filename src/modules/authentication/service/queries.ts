import type { UserSchema } from "@insforge/sdk"
import { queryOptions, useQuery } from "@tanstack/react-query"

import { readGuestMode, writeGuestMode } from "../lib/guest-mode"
import { auth } from "./api"
import { authKeys } from "./keys"

export interface Session {
  user: UserSchema | null
  /** The person chose to use the app without an account on this device. */
  isGuest: boolean
}

export const sessionQueryOptions = () =>
  queryOptions({
    queryFn: async (): Promise<Session> => {
      const user = await auth.currentUser()

      // A real session always wins over a leftover guest choice.
      if (user) {
        writeGuestMode(false)
      }

      return { isGuest: !user && readGuestMode(), user }
    },
    queryKey: authKeys.session(),
    // The session only changes through the mutations below, which write the
    // new value straight into the cache.
    staleTime: Number.POSITIVE_INFINITY,
  })

export const useSession = () => useQuery(sessionQueryOptions())
