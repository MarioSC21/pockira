import { onOpenUrl } from "@tauri-apps/plugin-deep-link"
import { openUrl } from "@tauri-apps/plugin-opener"

import { auth } from "../service/api"
import type { OAuthProvider } from "../service/api"

const DESKTOP_REDIRECT_TO = "pockira://auth-callback"

type Session = Awaited<ReturnType<typeof auth.exchangeOAuthCode>>

async function waitForOAuthCode(): Promise<string> {
  let resolveCode: (code: string) => void
  let rejectCode: (error: Error) => void

  // oxlint-disable-next-line promise/avoid-new -- bridges the deep-link "open URL" event into an awaitable value
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve
    rejectCode = reject
  })

  const unlisten = await onOpenUrl((urls) => {
    const callbackUrl = urls.find((candidate) =>
      candidate.startsWith(DESKTOP_REDIRECT_TO)
    )

    if (!callbackUrl) {
      return
    }

    const code = new URL(callbackUrl).searchParams.get("insforge_code")

    if (code) {
      resolveCode(code)
    } else {
      rejectCode(new Error("El enlace de autenticación no incluyó un código"))
    }
  })

  try {
    return await codePromise
  } finally {
    unlisten()
  }
}

export async function signInWithOAuthOnDesktop(
  provider: OAuthProvider
): Promise<Session> {
  const { url, codeVerifier } = await auth.loginWithOAuth(provider, {
    redirectTo: DESKTOP_REDIRECT_TO,
    skipBrowserRedirect: true,
  })

  await openUrl(url)

  const code = await waitForOAuthCode()

  return auth.exchangeOAuthCode(code, codeVerifier)
}
