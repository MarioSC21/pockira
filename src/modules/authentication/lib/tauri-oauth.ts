import { cancel, onUrl, start } from "@fabianlars/tauri-plugin-oauth"
import { openUrl } from "@tauri-apps/plugin-opener"

import { auth } from "../service/api"
import type { OAuthProvider } from "../service/api"

/**
 * Desktop OAuth uses a loopback server instead of the `pockira://` deep link:
 * Chrome silently refuses to open a custom scheme at the end of the
 * Google → InsForge redirect chain, which left the sign-in hanging on
 * Google's account chooser. A plain http://localhost redirect always loads.
 *
 * The backend only redirects to allowlisted URLs, so the ports are fixed and
 * every `http://localhost:<port>/auth-callback` below must be listed in
 * `allowed_redirect_urls` (insforge.toml / InsForge dashboard).
 */
const LOOPBACK_PORTS = [17_345, 17_346]
const CALLBACK_PATH = "/auth-callback"

// Long enough to pick an account and approve, short enough that an abandoned
// browser tab does not leave the sign-in button disabled forever.
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000

const SUCCESS_PAGE = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Pockira</title>
<style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;display:grid;place-items:center;height:100vh;margin:0;text-align:center}</style>
</head><body><div><h1>Listo</h1><p>Ya puedes cerrar esta pestaña y volver a Pockira.</p></div></body></html>`

/** Thrown when the person cancels the browser sign-in from the app. */
export class OAuthCancelledError extends Error {
  constructor() {
    super("Inicio de sesión cancelado")
    this.name = "OAuthCancelledError"
  }
}

type Session = Awaited<ReturnType<typeof auth.exchangeOAuthCode>>

/** Starts the loopback server and returns its redirect URL plus the pending
    code. The listener is up before the browser opens. */
async function listenForOAuthCode(signal?: AbortSignal) {
  const port = await start({ ports: LOOPBACK_PORTS, response: SUCCESS_PAGE })

  let resolveCode: (code: string) => void
  let rejectCode: (error: Error) => void

  // oxlint-disable-next-line promise/avoid-new -- bridges the loopback "URL received" event into an awaitable value
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve
    rejectCode = reject
  })

  const unlisten = await onUrl((url) => {
    const callbackUrl = new URL(url)

    if (callbackUrl.pathname !== CALLBACK_PATH) {
      return
    }

    const code = callbackUrl.searchParams.get("insforge_code")
    const error =
      callbackUrl.searchParams.get("error_description") ??
      callbackUrl.searchParams.get("error")

    if (code) {
      resolveCode(code)
    } else {
      rejectCode(
        new Error(error ?? "El enlace de autenticación no incluyó un código")
      )
    }
  })

  const timeout = setTimeout(() => {
    rejectCode(
      new Error("Se agotó el tiempo para iniciar sesión. Inténtalo de nuevo.")
    )
  }, OAUTH_TIMEOUT_MS)

  // Closing the browser tab sends nothing back, so the app offers a cancel
  // button instead of waiting out the timeout.
  const handleAbort = () => rejectCode(new OAuthCancelledError())
  signal?.addEventListener("abort", handleAbort, { once: true })

  const dispose = async () => {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", handleAbort)
    unlisten()
    await cancel(port).catch(() => null)
  }

  return {
    async code() {
      try {
        return await codePromise
      } finally {
        await dispose()
      }
    },
    dispose,
    redirectTo: `http://localhost:${port}${CALLBACK_PATH}`,
  }
}

export async function signInWithOAuthOnDesktop(
  provider: OAuthProvider,
  signal?: AbortSignal
): Promise<Session> {
  const pending = await listenForOAuthCode(signal)

  try {
    const { url, codeVerifier } = await auth.loginWithOAuth(provider, {
      redirectTo: pending.redirectTo,
      skipBrowserRedirect: true,
    })

    if (signal?.aborted) {
      throw new OAuthCancelledError()
    }

    await openUrl(url)

    const code = await pending.code()

    return await auth.exchangeOAuthCode(code, codeVerifier)
  } catch (error) {
    // Frees the port when the flow fails before the code arrives.
    await pending.dispose()
    throw error
  }
}
