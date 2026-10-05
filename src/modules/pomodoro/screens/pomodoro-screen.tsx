import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Settings2Icon,
  SkipForwardIcon,
} from "lucide-react"
import { useState } from "react"

import { PomodoroSettingsDialog } from "@/modules/pomodoro/components/pomodoro-settings-dialog"
import { usePomodoro } from "@/modules/pomodoro/hooks/use-pomodoro"
import type { PomodoroMode } from "@/modules/pomodoro/lib/pomodoro-store"
import {
  pausePomodoro,
  resetPomodoro,
  selectPomodoroMode,
  skipPomodoroPhase,
  startPomodoro,
} from "@/modules/pomodoro/lib/pomodoro-store"
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/lib/utils"

const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: "Enfoque",
  longBreak: "Descanso largo",
  shortBreak: "Descanso corto",
}

// Tab order follows the cycle, not the (alphabetised) object keys.
const MODE_ORDER: PomodoroMode[] = ["focus", "shortBreak", "longBreak"]

const MODE_HINT: Record<PomodoroMode, string> = {
  focus: "Concéntrate en una sola cosa",
  longBreak: "Aléjate de la pantalla un rato",
  shortBreak: "Estírate, toma agua",
}

// Ring geometry in SVG units; the element scales with its container.
const RING_SIZE = 240
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function PomodoroScreen() {
  const pomodoro = usePomodoro()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isRunning = pomodoro.status === "running"

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-y-auto p-6">
      <Button
        aria-label="Ajustes del pomodoro"
        className="absolute top-4 right-4"
        onClick={() => setIsSettingsOpen(true)}
        size="icon"
        variant="ghost"
      >
        <Settings2Icon />
      </Button>

      <Tabs
        onValueChange={(value) => selectPomodoroMode(value as PomodoroMode)}
        value={pomodoro.mode}
      >
        <TabsList>
          {MODE_ORDER.map((mode) => (
            <TabsTrigger key={mode} value={mode}>
              {MODE_LABEL[mode]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative aspect-square w-full max-w-64">
        <svg
          aria-hidden="true"
          className="size-full -rotate-90"
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          <circle
            className="stroke-muted"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            fill="none"
            r={RING_RADIUS}
            strokeWidth={RING_STROKE}
          />
          <circle
            className={cn(
              "transition-[stroke-dashoffset] duration-300 ease-linear",
              pomodoro.mode === "focus" ? "stroke-primary" : "stroke-chart-2"
            )}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            fill="none"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - pomodoro.progress)}
            strokeLinecap="round"
            strokeWidth={RING_STROKE}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            aria-live="off"
            className="font-heading text-6xl font-semibold tabular-nums"
          >
            {formatTime(pomodoro.remainingMs)}
          </span>
          <span className="text-muted-foreground text-sm">
            {pomodoro.status === "paused"
              ? "En pausa"
              : MODE_HINT[pomodoro.mode]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          aria-label="Reiniciar"
          onClick={resetPomodoro}
          size="icon-lg"
          title="Reiniciar"
          variant="outline"
        >
          <RotateCcwIcon />
        </Button>
        <Button
          className="w-36"
          onClick={isRunning ? pausePomodoro : startPomodoro}
          size="lg"
        >
          {isRunning ? <PauseIcon /> : <PlayIcon />}
          {isRunning ? "Pausar" : "Iniciar"}
        </Button>
        <Button
          aria-label="Saltar a la siguiente fase"
          onClick={skipPomodoroPhase}
          size="icon-lg"
          title="Saltar"
          variant="outline"
        >
          <SkipForwardIcon />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div aria-hidden="true" className="flex gap-1.5">
          {Array.from(
            { length: pomodoro.settings.longBreakEvery },
            (_, index) => (
              <span
                className={cn(
                  "size-2 rounded-full",
                  index < pomodoro.cycleCount ? "bg-primary" : "bg-muted"
                )}
                // oxlint-disable-next-line react/no-array-index-key -- fixed-length dots with no identity
                key={index}
              />
            )
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          Hoy: {pomodoro.today.count}{" "}
          {pomodoro.today.count === 1 ? "pomodoro" : "pomodoros"}
        </p>
      </div>

      <PomodoroSettingsDialog
        onOpenChange={setIsSettingsOpen}
        open={isSettingsOpen}
        settings={pomodoro.settings}
      />
    </div>
  )
}
