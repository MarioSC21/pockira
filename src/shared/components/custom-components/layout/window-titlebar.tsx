import { useCanGoBack, useRouter } from "@tanstack/react-router"
import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  MenuIcon,
  MinusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { dispatchAppCommand } from "@/shared/lib/app-commands"
import { cn } from "@/shared/lib/utils"
import { hasCustomTitlebar } from "@/shared/lib/window-chrome"
import { showSystemNotification } from "@/shared/service/system-notifications"

const ZOOM_STORAGE_KEY = "pockira:zoom"
const TRAY_HINT_KEY = "pockira:tray-hint-shown"
const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2

function readZoom() {
  try {
    const stored = Number(localStorage.getItem(ZOOM_STORAGE_KEY))
    return stored >= ZOOM_MIN && stored <= ZOOM_MAX ? stored : 1
  } catch {
    return 1
  }
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1")
  } catch {
    // Only means the hint may show again.
  }
}

// Closing the window only hides it to the tray; this quits for real.
const handleCheckForUpdates = () => dispatchAppCommand("check-for-updates")

const handleQuit = async () => {
  await invoke("quit_app")
}

const handleToggleNotesList = () => dispatchAppCommand("toggle-notes-list")
const handleReload = () => window.location.reload()

function WindowControl({
  children,
  label,
  onClick,
  variant = "default",
}: {
  children: ReactNode
  label: string
  onClick: () => void
  variant?: "default" | "close"
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "text-muted-foreground flex h-full w-12 items-center justify-center transition-colors [&_svg]:size-4 [&_svg]:stroke-[1.25]",
        // Windows' own close red, so the button reads as the system one.
        variant === "close"
          ? "hover:bg-[#c42b1c] hover:text-white"
          : "hover:bg-foreground/10 hover:text-foreground"
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

/**
 * Desktop title bar in the spirit of Claude Desktop: an app menu and history
 * arrows on the left, a drag area in the middle (double click maximizes,
 * handled by Tauri) and the window buttons on the right. It blends with the
 * sidebar instead of reading as a separate strip. Renders nothing outside
 * the desktop app.
 */
export function WindowTitlebar() {
  if (!hasCustomTitlebar()) {
    return null
  }

  return <DesktopTitlebar />
}

function DesktopTitlebar() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const [isMaximized, setIsMaximized] = useState(false)
  const [zoom, setZoom] = useState(readZoom)
  const [version, setVersion] = useState<string | null>(null)

  // The installed version, shown at the bottom of the app menu.
  useEffect(() => {
    let isActive = true

    const loadVersion = async () => {
      const installed = await getVersion()
      if (isActive) {
        setVersion(installed)
      }
    }

    void loadVersion()

    return () => {
      isActive = false
    }
  }, [])

  const appWindow = getCurrentWindow()

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let isActive = true
    const currentWindow = getCurrentWindow()

    const sync = async () => {
      const maximized = await currentWindow.isMaximized()
      if (isActive) {
        setIsMaximized(maximized)
      }
    }

    const subscribe = async () => {
      await sync()
      const stop = await currentWindow.onResized(sync)

      // The effect may have been cleaned up while the listener was attaching.
      if (isActive) {
        unlisten = stop
      } else {
        stop()
      }
    }

    void subscribe()

    return () => {
      isActive = false
      unlisten?.()
    }
  }, [])

  // The zoom level survives restarts; it is applied to the whole webview.
  useEffect(() => {
    void getCurrentWebview().setZoom(zoom)

    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom))
    } catch {
      // Not remembering the zoom is harmless.
    }
  }, [zoom])

  const changeZoom = (next: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
    setZoom(Math.round(clamped * 10) / 10)
  }

  const toggleFullscreen = async () => {
    const isFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!isFullscreen)
  }

  const handleNewNote = async () => {
    await router.navigate({ to: "/notes" })
    dispatchAppCommand("new-note")
  }

  const handleBack = () => router.history.back()
  const handleForward = () => router.history.forward()
  const handleGoToNotes = async () => {
    await router.navigate({ to: "/notes" })
  }
  const handleZoomIn = () => changeZoom(zoom + ZOOM_STEP)
  const handleZoomOut = () => changeZoom(zoom - ZOOM_STEP)
  const handleZoomReset = () => changeZoom(1)
  const handleMinimize = async () => {
    await appWindow.minimize()
  }
  const handleToggleMaximize = async () => {
    await appWindow.toggleMaximize()
  }
  // The X hides the window to the tray (Rust keeps the app running); the
  // first time, say so, or it looks like the app never closes.
  const handleClose = async () => {
    if (!readFlag(TRAY_HINT_KEY)) {
      writeFlag(TRAY_HINT_KEY)
      await showSystemNotification(
        "Pockira sigue abierto",
        "Está en la bandeja del sistema. Para cerrarlo del todo, usa Salir."
      )
    }
    await appWindow.close()
  }

  // Desktop shortcuts for the menu entries. Editing keys (copy, undo, bold…)
  // are left to the focused field and the editor.
  useEffect(() => {
    // Keyed by modifier + key, e.g. "ctrl+n", "alt+arrowleft", "f11".
    const shortcuts: Record<string, () => unknown> = {
      "alt+arrowleft": handleBack,
      "alt+arrowright": handleForward,
      "ctrl+-": handleZoomOut,
      "ctrl++": handleZoomIn,
      "ctrl+0": handleZoomReset,
      "ctrl+=": handleZoomIn,
      "ctrl+\\": handleToggleNotesList,
      "ctrl+n": handleNewNote,
      "ctrl+q": handleQuit,
      f11: toggleFullscreen,
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // Shift is left alone so Ctrl+Shift+… stays free for the editor.
      if (event.shiftKey && event.key.toLowerCase() !== "+") {
        return
      }

      let modifier = ""
      if (event.ctrlKey || event.metaKey) {
        modifier = "ctrl+"
      } else if (event.altKey) {
        modifier = "alt+"
      }

      const action = shortcuts[`${modifier}${event.key.toLowerCase()}`]

      if (action) {
        event.preventDefault()
        void action()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <header
      className="bg-sidebar fixed inset-x-0 top-0 z-50 flex h-(--titlebar-height) items-center select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-0.5 pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menú de la aplicación"
            render={<Button size="icon-sm" variant="ghost" />}
          >
            <MenuIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto min-w-36">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Archivo</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56">
                <DropdownMenuItem onClick={handleNewNote}>
                  Nueva nota
                  <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCheckForUpdates}>
                  Buscar actualizaciones
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleQuit}>
                  Salir
                  <DropdownMenuShortcut>Ctrl+Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Ver</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56">
                <DropdownMenuItem onClick={handleToggleNotesList}>
                  Mostrar u ocultar lista
                  <DropdownMenuShortcut>Ctrl+\</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleZoomIn}>
                  Acercar
                  <DropdownMenuShortcut>Ctrl+=</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleZoomOut}>
                  Alejar
                  <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleZoomReset}>
                  Tamaño real ({Math.round(zoom * 100)}%)
                  <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleFullscreen}>
                  Pantalla completa
                  <DropdownMenuShortcut>F11</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReload}>
                  Recargar
                  <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Ir</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56">
                <DropdownMenuItem disabled={!canGoBack} onClick={handleBack}>
                  Atrás
                  <DropdownMenuShortcut>Alt+←</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleForward}>
                  Adelante
                  <DropdownMenuShortcut>Alt+→</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGoToNotes}>
                  Mis notas
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {version ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Versión {version}</DropdownMenuLabel>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          aria-label="Atrás"
          disabled={!canGoBack}
          onClick={handleBack}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          aria-label="Adelante"
          onClick={handleForward}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowRightIcon />
        </Button>
      </div>
      <div className="h-full flex-1" data-tauri-drag-region />
      <div className="flex h-full">
        <WindowControl label="Minimizar" onClick={handleMinimize}>
          <MinusIcon aria-hidden="true" />
        </WindowControl>
        <WindowControl
          label={isMaximized ? "Restaurar" : "Maximizar"}
          onClick={handleToggleMaximize}
        >
          {isMaximized ? (
            <CopyIcon aria-hidden="true" />
          ) : (
            <SquareIcon aria-hidden="true" />
          )}
        </WindowControl>
        <WindowControl label="Cerrar" onClick={handleClose} variant="close">
          <XIcon aria-hidden="true" />
        </WindowControl>
      </div>
    </header>
  )
}
