import { CoffeeIcon, TimerIcon } from "lucide-react"

import { usePomodoro } from "@/modules/pomodoro/hooks/use-pomodoro"
import {
  dismissPomodoroAlert,
  skipPomodoroPhase,
  startPomodoro,
} from "@/modules/pomodoro/lib/pomodoro-store"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

function handleStart() {
  startPomodoro()
  dismissPomodoroAlert()
}

function handleSkip() {
  skipPomodoroPhase()
  dismissPomodoroAlert()
}

/** Big in-app notice when a phase ends, on top of whatever screen is open,
    so the change to a break (or back to focus) cannot go unnoticed. */
export function PomodoroAlert() {
  const pomodoro = usePomodoro()
  const isBreak = pomodoro.mode !== "focus"
  const isRunning = pomodoro.status === "running"
  const minutes = Math.ceil(pomodoro.remainingMs / 60_000)
  const Icon = isBreak ? CoffeeIcon : TimerIcon

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          dismissPomodoroAlert()
        }
      }}
      open={pomodoro.alert !== null}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary mb-2 flex size-16 items-center justify-center rounded-full">
            <Icon className="size-8" />
          </span>
          <DialogTitle className="text-2xl">
            {isBreak ? "¡Hora de descansar!" : "¡Descanso terminado!"}
          </DialogTitle>
          <DialogDescription>
            {isBreak
              ? `Aléjate de la pantalla ${minutes} minutos.`
              : `A enfocarte ${minutes} minutos.`}
            {isRunning && " El temporizador ya está corriendo."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleSkip} variant="ghost">
            {isBreak ? "Saltar descanso" : "Saltar enfoque"}
          </Button>
          {isRunning ? (
            <Button onClick={dismissPomodoroAlert}>Entendido</Button>
          ) : (
            <Button onClick={handleStart}>
              {isBreak ? "Empezar descanso" : "Empezar enfoque"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
