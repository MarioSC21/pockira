import { insforge } from "@/shared/service/insforge-client"

export type OAuthProvider = "google" | "github"

export const auth = {
  async loginWithOAuth(
    provider: OAuthProvider,
    options: { redirectTo: string; skipBrowserRedirect?: boolean }
  ) {
    const { data, error } = await insforge.auth.signInWithOAuth(
      provider,
      options
    )

    if (error || !data.url) {
      throw new Error(
        error?.message ?? "No se pudo iniciar el inicio de sesión"
      )
    }

    return { codeVerifier: data.codeVerifier, url: data.url }
  },

  async exchangeOAuthCode(code: string, codeVerifier?: string) {
    const { data, error } = await insforge.auth.exchangeOAuthCode(
      code,
      codeVerifier
    )

    if (error || !data) {
      throw new Error(
        error?.message ?? "No se pudo completar el inicio de sesión"
      )
    }

    return data
  },

  getCurrentUser() {
    return insforge.auth.getCurrentUser()
  },

  logout() {
    return insforge.auth.signOut()
  },
}
