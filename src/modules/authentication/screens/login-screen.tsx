import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { OAuthButton } from "../components/oauth-button"
import { useAuth } from "../context/auth-context"

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function LoginScreen() {
  const { signInWithOAuth } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setIsSigningIn(true)

    try {
      await signInWithOAuth("google")
      await navigate({ to: "/notes" })
    } catch (signInError) {
      setIsSigningIn(false)
      setError(toErrorMessage(signInError, "No se pudo iniciar sesión"))
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Iniciar sesión
          </h1>
          <p className="text-muted-foreground text-sm">
            Entra a tu cuenta de Pockira con Google
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-center text-sm">{error}</p>
        ) : null}

        <OAuthButton
          disabled={isSigningIn}
          onClick={handleGoogleSignIn}
          provider="google"
        />
      </div>
    </div>
  )
}
