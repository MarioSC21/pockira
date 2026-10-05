import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import type { Update } from "@tauri-apps/plugin-updater"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { useAppCommand } from "@/shared/lib/app-commands"
import { isDesktopApp } from "@/shared/lib/platform"

// Give the app a moment to open before touching the network.
const FIRST_CHECK_DELAY_MS = 5000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

type UpdateState =
  | { kind: "idle" }
  | { kind: "available"; update: Update }
  | { kind: "downloading"; update: Update; percent: number | null }
  | { kind: "up-to-date" }
  | { kind: "error"; message: string }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Desktop self-update: looks for a newer release on GitHub at launch, every
 * few hours and from the app menu ("Buscar actualizaciones"), then downloads,
 * installs and restarts on request. Renders nothing outside the desktop app.
 */
export function AppUpdateDialog() {
  if (!isDesktopApp()) {
    return null
  }

  return <DesktopUpdateDialog />
}

function DesktopUpdateDialog() {
  const [state, setState] = useState<UpdateState>({ kind: "idle" })
  // "Más tarde" silences automatic checks until the next launch; a manual
  // check from the menu still shows the result.
  const dismissedRef = useRef(false)

  const runCheck = async (manual: boolean) => {
    if (!manual && dismissedRef.current) {
      return
    }

    try {
      const update = await check()

      if (update) {
        setState({ kind: "available", update })
      } else if (manual) {
        setState({ kind: "up-to-date" })
      }
    } catch (error) {
      // Offline or no release yet: only worth mentioning when asked.
      if (manual) {
        setState({ kind: "error", message: errorMessage(error) })
      }
    }
  }

  const runCheckRef = useRef(runCheck)
  useEffect(() => {
    runCheckRef.current = runCheck
  })

  useEffect(() => {
    const first = setTimeout(
      () => runCheckRef.current(false),
      FIRST_CHECK_DELAY_MS
    )
    const periodic = setInterval(
      () => runCheckRef.current(false),
      CHECK_EVERY_MS
    )

    return () => {
      clearTimeout(first)
      clearInterval(periodic)
    }
  }, [])

  useAppCommand("check-for-updates", () => {
    void runCheck(true)
  })

  const handleInstall = async (update: Update) => {
    let total = 0
    let downloaded = 0
    setState({ kind: "downloading", percent: null, update })

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength
          setState({
            kind: "downloading",
            percent: total > 0 ? Math.round((downloaded / total) * 100) : null,
            update,
          })
        }
      })
      // On Windows the installer closes the app itself; elsewhere restart.
      await relaunch()
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) })
    }
  }

  const handleClose = () => {
    if (state.kind === "downloading") {
      return
    }
    if (state.kind === "available") {
      dismissedRef.current = true
    }
    setState({ kind: "idle" })
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          handleClose()
        }
      }}
      open={state.kind !== "idle"}
    >
      <DialogContent>
        {state.kind === "available" || state.kind === "downloading" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Nueva versión {state.update.version} disponible
              </DialogTitle>
              <DialogDescription>
                {state.kind === "downloading"
                  ? `Descargando${state.percent === null ? "…" : ` ${state.percent}%`}. La app se reiniciará al terminar.`
                  : `Tienes la ${state.update.currentVersion}. Al actualizar, la app se reinicia; tus notas no se pierden.`}
              </DialogDescription>
            </DialogHeader>
            {state.kind === "downloading" ? (
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-[width]"
                  style={{ width: `${state.percent ?? 15}%` }}
                />
              </div>
            ) : null}
            <DialogFooter>
              <Button
                disabled={state.kind === "downloading"}
                onClick={handleClose}
                variant="ghost"
              >
                Más tarde
              </Button>
              <Button
                disabled={state.kind === "downloading"}
                onClick={() => handleInstall(state.update)}
              >
                {state.kind === "downloading"
                  ? "Actualizando…"
                  : "Actualizar y reiniciar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {state.kind === "error"
                  ? "No se pudo buscar actualizaciones"
                  : "Pockira está al día"}
              </DialogTitle>
              <DialogDescription>
                {state.kind === "error"
                  ? state.message
                  : "Ya tienes la última versión."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleClose}>Aceptar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
