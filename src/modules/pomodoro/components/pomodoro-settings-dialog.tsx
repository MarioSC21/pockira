import { useState } from "react"
import type { FormEvent } from "react"

import type { PomodoroSettings } from "@/modules/pomodoro/lib/pomodoro-store"
import {
  DEFAULT_SETTINGS,
  updatePomodoroSettings,
} from "@/modules/pomodoro/lib/pomodoro-store"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

const FIELDS: {
  key: keyof PomodoroSettings
  label: string
  max: number
}[] = [
  { key: "focusMinutes", label: "Enfoque (min)", max: 180 },
  { key: "shortBreakMinutes", label: "Descanso corto (min)", max: 60 },
  { key: "longBreakMinutes", label: "Descanso largo (min)", max: 120 },
  { key: "longBreakEvery", label: "Pomodoros hasta descanso largo", max: 12 },
]

interface PomodoroSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: PomodoroSettings
}

export function PomodoroSettingsDialog({
  open,
  onOpenChange,
  settings,
}: PomodoroSettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustes del pomodoro</DialogTitle>
        </DialogHeader>
        {/* Mounted while open so the form starts from the saved values. */}
        {open && (
          <SettingsForm
            onDone={() => onOpenChange(false)}
            settings={settings}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SettingsForm({
  settings,
  onDone,
}: {
  settings: PomodoroSettings
  onDone: () => void
}) {
  const [draft, setDraft] = useState(settings)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updatePomodoroSettings(draft)
    onDone()
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <div className="flex flex-col gap-2" key={field.key}>
            <Label htmlFor={`pomodoro-${field.key}`}>{field.label}</Label>
            <Input
              id={`pomodoro-${field.key}`}
              max={field.max}
              min={1}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  [field.key]: Number(event.target.value),
                }))
              }
              required
              type="number"
              value={draft[field.key]}
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button
          onClick={() => setDraft(DEFAULT_SETTINGS)}
          type="button"
          variant="ghost"
        >
          Restablecer
        </Button>
        <Button type="submit">Guardar</Button>
      </DialogFooter>
    </form>
  )
}
