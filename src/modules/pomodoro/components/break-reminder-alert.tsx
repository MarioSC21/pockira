import { useSyncExternalStore } from "react"

import {
  finishBreakReminder,
  getBreakReminderState,
  snoozeBreakReminder,
  startBreakFromReminder,
  subscribeBreakReminder,
} from "@/modules/pomodoro/lib/break-reminder"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

const TIPS = [
  "Estira los brazos hacia arriba 10 segundos",
  "Gira los hombros hacia atrás 5 veces",
  "Mira algo lejano 20 segundos para descansar la vista",
  "Toma un vaso de agua",
]

/** A person stretching with arms up; drawn with theme colors so it fits
    light and dark mode. */
function StretchIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="text-primary h-40 w-auto"
      fill="none"
      viewBox="0 0 200 200"
    >
      <circle className="fill-primary/10" cx="100" cy="110" r="88" />
      {/* Sparkles: the "ahh" of a good stretch. */}
      <g className="stroke-primary/60" strokeLinecap="round" strokeWidth="4">
        <path d="M40 46v14M33 53h14" />
        <path d="M160 40v14M153 47h14" />
        <path d="M168 96v10M163 101h10" />
        <path d="M30 100v10M25 105h10" />
      </g>
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      >
        {/* Arms reaching up, hands together. */}
        <path d="M86 92 74 58l26-30 26 30-12 34" />
        {/* Body and legs. */}
        <path d="M100 96v52" />
        <path d="m100 148-18 36M100 148l18 36" />
        <path d="M86 92h28" />
      </g>
      <circle className="fill-primary" cx="100" cy="76" r="15" />
      {/* Closed, relaxed eyes and a smile. */}
      <g
        className="stroke-primary-foreground"
        strokeLinecap="round"
        strokeWidth="2.5"
      >
        <path d="M93 75q2.5 2 5 0M102 75q2.5 2 5 0" />
        <path d="M95 81q5 4 10 0" />
      </g>
    </svg>
  )
}

/** Shown after a long stretch of continuous use, over whatever screen is
    open, with the window pulled to the front. */
export function BreakReminderAlert() {
  const { isAlertOpen, settings } = useSyncExternalStore(
    subscribeBreakReminder,
    getBreakReminderState
  )
  const hours = settings.everyMinutes / 60
  const usedFor =
    settings.everyMinutes >= 60
      ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
      : `${settings.everyMinutes} min`

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          snoozeBreakReminder()
        }
      }}
      open={isAlertOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <StretchIllustration />
          <DialogTitle className="text-2xl">
            ¡Estírate y toma un descanso!
          </DialogTitle>
          <DialogDescription>
            Llevas {usedFor} usando la PC sin parar.
          </DialogDescription>
        </DialogHeader>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={snoozeBreakReminder} variant="ghost">
            En 10 min
          </Button>
          <Button onClick={finishBreakReminder} variant="outline">
            Ya me estiré
          </Button>
          <Button onClick={startBreakFromReminder}>Iniciar descanso</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
