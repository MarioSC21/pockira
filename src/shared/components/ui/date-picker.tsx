import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"

export interface DatePickerProps {
  value?: Date
  onValueChange?: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(value)

  const selectedDate = value ?? date

  const handleSelect = (nextDate: Date | undefined) => {
    setDate(nextDate)
    onValueChange?.(nextDate)
    setOpen(false)
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-empty={!selectedDate}
            className="data-[empty=true]:text-muted-foreground justify-start text-left font-normal"
          />
        }
      >
        <CalendarIcon />
        {selectedDate ? (
          format(selectedDate, "PPP")
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto overflow-hidden p-0">
        <Calendar
          captionLayout="dropdown"
          defaultMonth={selectedDate}
          mode="single"
          onSelect={handleSelect}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}
