import { useState } from "react"

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

const repeatIntervals = [
  { label: "Diario", value: "daily" },
  { label: "Semanal", value: "weekly" },
  { label: "Mensual", value: "monthly" },
] as const

type RepeatInterval = (typeof repeatIntervals)[number]["value"]

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  const [repeat, setRepeat] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>("daily")

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordatorio</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
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
              <DatePicker placeholder="Elegir fecha" />
            </div>
            <div className="flex w-28 flex-col gap-2">
              <Label htmlFor="reminder-time">Hora</Label>
              <Input
                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                defaultValue="09:00:00"
                id="reminder-time"
                step="1"
                type="time"
              />
            </div>
          </div>
          <Button className="w-full">Agregar recordatorio</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
