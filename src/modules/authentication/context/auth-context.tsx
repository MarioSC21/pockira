import type { UserSchema } from "@insforge/sdk"
import { isTauri } from "@tauri-apps/api/core"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"

import { signInWithOAuthOnDesktop } from "../lib/tauri-oauth"
import { auth } from "../service/api"
import type { OAuthProvider } from "../service/api"

const WEB_OAUTH_REDIRECT_TO = "http://localhost:1420/notes"

interface AuthContextValue {
  user: UserSchema | null
  loading: boolean
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const { data, error } = await auth.getCurrentUser()

      if (cancelled) {
        return
      }

      setUser(error ? null : (data?.user ?? null))
      setLoading(false)
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (isTauri()) {
      const session = await signInWithOAuthOnDesktop(provider)
      setUser(session.user)
      return
    }

    await auth.loginWithOAuth(provider, {
      redirectTo: WEB_OAUTH_REDIRECT_TO,
    })
  }, [])

  const signOut = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signInWithOAuth, signOut }),
    [user, loading, signInWithOAuth, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }

  return context
}
