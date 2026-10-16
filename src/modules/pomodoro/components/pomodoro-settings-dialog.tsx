import { useState } from "react"
import type { FormEvent } from "react"

import type { BreakReminderSettings } from "@/modules/pomodoro/lib/break-reminder"
import {
  DEFAULT_BREAK_REMINDER,
  getBreakReminderState,
  updateBreakReminderSettings,
} from "@/modules/pomodoro/lib/break-reminder"
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
import { Switch } from "@/shared/components/ui/switch"
import { isDesktopApp } from "@/shared/lib/platform"

type NumberSetting = {
  [K in keyof PomodoroSettings]: PomodoroSettings[K] extends number ? K : never
}[keyof PomodoroSettings]
type ToggleSetting = Exclude<keyof PomodoroSettings, NumberSetting>

const FIELDS: {
  key: NumberSetting
  label: string
  max: number
}[] = [
  { key: "focusMinutes", label: "Enfoque (min)", max: 180 },
  { key: "shortBreakMinutes", label: "Descanso corto (min)", max: 60 },
  { key: "longBreakMinutes", label: "Descanso largo (min)", max: 120 },
  { key: "longBreakEvery", label: "Pomodoros hasta descanso largo", max: 12 },
]

const TOGGLES: { key: ToggleSetting; label: string }[] = [
  { key: "autoStartBreaks", label: "Iniciar descansos automáticamente" },
  { key: "autoStartFocus", label: "Iniciar enfoque automáticamente" },
  { key: "sound", label: "Sonido al terminar cada fase" },
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
  const [reminder, setReminder] = useState<BreakReminderSettings>(
    () => getBreakReminderState().settings
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updatePomodoroSettings(draft)
    updateBreakReminderSettings(reminder)
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
      <div className="flex flex-col gap-3">
        {TOGGLES.map((toggle) => (
          <div
            className="flex items-center justify-between gap-4"
            key={toggle.key}
          >
            <Label htmlFor={`pomodoro-${toggle.key}`}>{toggle.label}</Label>
            <Switch
              checked={draft[toggle.key]}
              id={`pomodoro-${toggle.key}`}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({ ...prev, [toggle.key]: checked }))
              }
            />
          </div>
        ))}
      </div>
      {/* Needs the system idle time, which only the Windows app reads. */}
      {isDesktopApp() && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="break-reminder-enabled">
              Recordarme estirarme tras usar la PC
            </Label>
            <Switch
              checked={reminder.enabled}
              id="break-reminder-enabled"
              onCheckedChange={(enabled) =>
                setReminder((prev) => ({ ...prev, enabled }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="break-reminder-every">Cada (min de uso)</Label>
            <Input
              className="w-24"
              disabled={!reminder.enabled}
              id="break-reminder-every"
              max={480}
              min={5}
              onChange={(event) =>
                setReminder((prev) => ({
                  ...prev,
                  everyMinutes: Number(event.target.value),
                }))
              }
              required
              type="number"
              value={reminder.everyMinutes}
            />
          </div>
        </div>
      )}
      <DialogFooter>
        <Button
          onClick={() => {
            setDraft(DEFAULT_SETTINGS)
            setReminder(DEFAULT_BREAK_REMINDER)
          }}
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
