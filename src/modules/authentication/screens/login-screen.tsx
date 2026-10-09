import { useNavigate } from "@tanstack/react-router"
import { isTauri } from "@tauri-apps/api/core"
import { useEffect, useRef } from "react"

import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"

import { OAuthButton } from "../components/oauth-button"
import { OAuthCancelledError } from "../lib/tauri-oauth"
import { useContinueAsGuest, useSignInWithOAuth } from "../service/mutations"

export function LoginScreen() {
  const navigate = useNavigate()
  const signInWithOAuth = useSignInWithOAuth()
  const continueAsGuest = useContinueAsGuest()

  // Waiting for the browser (desktop Google sign-in) does not lock the guest
  // option: the person may have closed that tab, so it cancels the wait.
  // On the web the browser itself leaves for Google, so there is nothing to
  // wait for or cancel: the button just stays disabled until the page goes.
  const isDesktop = isTauri()
  const isWaitingForGoogle = isDesktop && signInWithOAuth.isPending
  const isRedirectingToGoogle =
    !isDesktop && (signInWithOAuth.isPending || signInWithOAuth.isSuccess)
  const error =
    signInWithOAuth.error instanceof OAuthCancelledError
      ? null
      : (signInWithOAuth.error ?? continueAsGuest.error)

  const googleAbortRef = useRef<AbortController | null>(null)

  const cancelGoogle = () => {
    googleAbortRef.current?.abort()
    googleAbortRef.current = null
  }

  // Leaving the screen frees the loopback port instead of waiting it out.
  useEffect(() => () => googleAbortRef.current?.abort(), [])

  const goToNotes = () => navigate({ replace: true, to: "/notes" })

  const handleGoogle = async () => {
    cancelGoogle()
    const controller = new AbortController()
    googleAbortRef.current = controller

    const user = await signInWithOAuth
      .mutateAsync({ provider: "google", signal: controller.signal })
      .catch(() => null)

    // On the web the browser is already on its way to Google.
    if (user) {
      await goToNotes()
    }
  }

  const handleGuest = async () => {
    cancelGoogle()
    await continueAsGuest.mutateAsync()
    await goToNotes()
  }

  return (
    <div className="bg-background flex min-h-full items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img alt="Pockira" className="size-12" src="/pockira.svg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground font-heading text-xl font-semibold">
              Iniciar sesión
            </h1>
            <p className="text-muted-foreground text-sm">
              Entra con Google para sincronizar tus notas
            </p>
          </div>
        </div>

        {error ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {error.message}
          </p>
        ) : null}

        {isWaitingForGoogle ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-muted-foreground text-sm">
              Completa el inicio de sesión en tu navegador…
            </p>
            <Button
              className="w-full"
              onClick={cancelGoogle}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <OAuthButton
            disabled={continueAsGuest.isPending || isRedirectingToGoogle}
            onClick={handleGoogle}
            provider="google"
          />
        )}

        <Separator />

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={continueAsGuest.isPending}
            onClick={handleGuest}
            type="button"
            variant="ghost"
          >
            Ingresar sin iniciar sesión
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Tus notas se guardarán solo en este dispositivo y no se
            sincronizarán.
          </p>
        </div>
      </div>
    </div>
  )
}
