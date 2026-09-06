import { format, isSameDay, isToday } from "date-fns"
import { es } from "date-fns/locale"

import {
  MiniCalendar,
  MiniCalendarDays,
  MiniCalendarNavigation,
} from "@/shared/components/ui/mini-calendar"
import { cn } from "@/shared/lib/utils"

interface NotesWeekCalendarProps {
  selected: Date
  onSelect: (date: Date) => void
}

export function NotesWeekCalendar({
  selected,
  onSelect,
}: NotesWeekCalendarProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium capitalize">
        {format(selected, "EEEE, d MMM", { locale: es })}
      </p>
      <MiniCalendar
        days={5}
        onValueChange={(date) => date && onSelect(date)}
        value={selected}
      >
        <MiniCalendarNavigation direction="prev" />
        <MiniCalendarDays className="flex-1 justify-between">
          {(date) => {
            const isSelected = isSameDay(date, selected)

            return (
              <button
                className="flex flex-col items-center gap-1"
                key={date.toISOString()}
                onClick={() => onSelect(date)}
                type="button"
              >
                <span className="text-muted-foreground text-[10px] font-medium uppercase">
                  {format(date, "EEEEE", { locale: es })}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                    isSelected && "border-primary text-primary border",
                    !isSelected && isToday(date) && "font-semibold"
                  )}
                >
                  {format(date, "d")}
                </span>
              </button>
            )
          }}
        </MiniCalendarDays>
        <MiniCalendarNavigation direction="next" />
      </MiniCalendar>
    </div>
  )
}
