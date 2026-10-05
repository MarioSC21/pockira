import { useState } from "react"
import type { FormEvent } from "react"

import { useCreateReminder } from "@/modules/notes/service/mutations"
import type { ReminderRepeatInterval } from "@/modules/notes/types/note"
import { Button } from "@/shared/components/ui/button"
import { ButtonGroup } from "@/shared/components/ui/button-group"
import { DatePicker } from "@/shared/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { ensureNotificationPermission } from "@/shared/service/system-notifications"

const repeatIntervals = [
  { label: "Diario", value: "daily" },
  { label: "Semanal", value: "weekly" },
  { label: "Mensual", value: "monthly" },
] as const

type RepeatInterval = (typeof repeatIntervals)[number]["value"]

const DEFAULT_TIME = "09:00"

/** Joins the picked day with the "HH:mm[:ss]" time input in local time. */
function toRemindAt(date: Date, time: string) {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number)
  const remindAt = new Date(date)
  remindAt.setHours(hours, minutes, seconds, 0)
  return remindAt
}

interface ReminderDialogProps {
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderDialog({
  noteId,
  open,
  onOpenChange,
}: ReminderDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordatorio</DialogTitle>
        </DialogHeader>
        {open && (
          <ReminderForm noteId={noteId} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReminderForm({
  noteId,
  onDone,
}: {
  noteId: string
  onDone: () => void
}) {
  const [repeat, setRepeat] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>("daily")
  const [date, setDate] = useState<Date | undefined>(() => new Date())
  const [time, setTime] = useState(DEFAULT_TIME)
  const [validationError, setValidationError] = useState<string | null>(null)
  const createReminder = useCreateReminder()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (!date) {
      setValidationError("Elige una fecha.")
      return
    }

    const remindAt = toRemindAt(date, time)

    if (remindAt.getTime() <= Date.now()) {
      setValidationError("El recordatorio debe ser en el futuro.")
      return
    }

    const interval: ReminderRepeatInterval = repeat ? repeatInterval : "none"

    // Asked here, on a click, so the system prompt has a clear reason. A
    // refusal still saves the reminder; it then arrives by email only.
    await ensureNotificationPermission().catch(() => false)

    await createReminder
      .mutateAsync({
        noteId,
        remindAt: remindAt.toISOString(),
        repeatInterval: interval,
      })
      .then(onDone, () => null)
  }

  const error = validationError ?? createReminder.error?.message

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Repetir</span>
        <Switch checked={repeat} onCheckedChange={setRepeat} />
      </div>
      {repeat && (
        <ButtonGroup className="w-full">
          {repeatIntervals.map((interval) => (
            <Button
              className="flex-1"
              key={interval.value}
              onClick={() => setRepeatInterval(interval.value)}
              type="button"
              variant={
                repeatInterval === interval.value ? "default" : "outline"
              }
            >
              {interval.label}
            </Button>
          ))}
        </ButtonGroup>
      )}
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="reminder-date">Fecha</Label>
          <DatePicker
            onValueChange={setDate}
            placeholder="Elegir fecha"
            value={date}
          />
        </div>
        <div className="flex w-28 flex-col gap-2">
          <Label htmlFor="reminder-time">Hora</Label>
          <Input
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            id="reminder-time"
            onChange={(event) => setTime(event.target.value)}
            required
            type="time"
            value={time}
          />
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="w-full"
        disabled={createReminder.isPending}
        type="submit"
      >
        {createReminder.isPending ? "Guardando…" : "Agregar recordatorio"}
      </Button>
    </form>
  )
}
