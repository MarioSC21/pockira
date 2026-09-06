import type { ReactNode } from "react"

import { Button } from "@/shared/components/ui/button"

import type { OAuthProvider } from "../service/api"

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Continuar con Google",
  github: "Continuar con GitHub",
}

const PROVIDER_ICON: Record<OAuthProvider, ReactNode> = {
  google: (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.86l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.31 14.36A7.2 7.2 0 0 1 4.93 12c0-.82.14-1.62.38-2.36V6.55H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.45l4.01-3.09Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.3 6.55l4.01 3.09C6.25 6.8 8.89 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  ),
  github: (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.17c-3.2.7-3.88-1.35-3.88-1.35-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.16v3.2c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  ),
}

interface OAuthButtonProps {
  provider: OAuthProvider
  onClick: () => void
  disabled?: boolean
}

export function OAuthButton({ provider, onClick, disabled }: OAuthButtonProps) {
  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {PROVIDER_ICON[provider]}
      {PROVIDER_LABEL[provider]}
    </Button>
  )
}
