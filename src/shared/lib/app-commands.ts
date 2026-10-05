import { useEffect, useRef } from "react"

/**
 * App-wide commands fired from the desktop menu or its shortcuts. The shell
 * (shared) only announces them; whichever screen can handle one subscribes,
 * so the title bar never imports feature modules.
 */
export type AppCommand = "new-note" | "toggle-notes-list" | "check-for-updates"

const COMMAND_EVENT = "pockira:command"

export function dispatchAppCommand(command: AppCommand) {
  window.dispatchEvent(
    new CustomEvent<AppCommand>(COMMAND_EVENT, { detail: command })
  )
}

/** Runs `handler` whenever `command` is dispatched while mounted. */
export function useAppCommand(command: AppCommand, handler: () => void) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<AppCommand>).detail === command) {
        handlerRef.current()
      }
    }

    window.addEventListener(COMMAND_EVENT, listener)
    return () => window.removeEventListener(COMMAND_EVENT, listener)
  }, [command])
}
