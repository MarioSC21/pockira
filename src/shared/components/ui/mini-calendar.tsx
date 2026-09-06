"use client"

import { cn } from "cn"
import { addDays, format, isSameDay, isToday } from "date-fns"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import type { ComponentProps, HTMLAttributes, ReactNode } from "react"

import { Button } from "@/shared/components/ui/button"
import { useControllableState } from "@/shared/hooks/use-controllable-state"

interface MiniCalendarContextType {
  selectedDate: Date | null | undefined
  onDateSelect: (date: Date) => void
  startDate: Date
  onNavigate: (direction: "prev" | "next") => void
  days: number
}

const MiniCalendarContext = createContext<MiniCalendarContextType | null>(null)

function useMiniCalendar() {
  const context = useContext(MiniCalendarContext)

  if (!context) {
    throw new Error("MiniCalendar components must be used within MiniCalendar")
  }

  return context
}

function getDays(startDate: Date, count: number): Date[] {
  const days: Date[] = []
  for (let i = 0; i < count; i += 1) {
    days.push(addDays(startDate, i))
  }
  return days
}

function formatDate(date: Date) {
  const month = format(date, "MMM")
  const day = format(date, "d")

  return { month, day }
}

export type MiniCalendarProps = HTMLAttributes<HTMLDivElement> & {
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date | undefined) => void
  startDate?: Date
  defaultStartDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  days?: number
}

export function MiniCalendar({
  value,
  defaultValue,
  onValueChange,
  startDate,
  defaultStartDate,
  onStartDateChange,
  days = 5,
  className,
  children,
  ...props
}: MiniCalendarProps) {
  const [initialStartDate] = useState(() => defaultStartDate ?? new Date())

  const [selectedDate, setSelectedDate] = useControllableState<
    Date | undefined
  >({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  const [currentStartDate, setCurrentStartDate] = useControllableState({
    prop: startDate,
    defaultProp: initialStartDate,
    onChange: onStartDateChange,
  })

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date)
    },
    [setSelectedDate]
  )

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      const newStartDate = addDays(
        currentStartDate || new Date(),
        direction === "next" ? days : -days
      )
      setCurrentStartDate(newStartDate)
    },
    [currentStartDate, days, setCurrentStartDate]
  )

  const contextValue = useMemo<MiniCalendarContextType>(
    () => ({
      selectedDate: selectedDate || null,
      onDateSelect: handleDateSelect,
      startDate: currentStartDate || new Date(),
      onNavigate: handleNavigate,
      days,
    }),
    [selectedDate, handleDateSelect, currentStartDate, handleNavigate, days]
  )

  return (
    <MiniCalendarContext.Provider value={contextValue}>
      <div
        className={cn(
          "bg-background flex items-center gap-2 rounded-lg border p-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </MiniCalendarContext.Provider>
  )
}

export type MiniCalendarNavigationProps = ComponentProps<typeof Button> & {
  direction: "prev" | "next"
}

export function MiniCalendarNavigation({
  direction,
  children,
  onClick,
  size = "icon",
  variant = "ghost",
  ...props
}: MiniCalendarNavigationProps) {
  const { onNavigate } = useMiniCalendar()
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon

  return (
    <Button
      onClick={(event) => {
        onNavigate(direction)
        onClick?.(event)
      }}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children ?? <Icon className="size-4" />}
    </Button>
  )
}

export type MiniCalendarDaysProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: (date: Date) => ReactNode
}

export function MiniCalendarDays({
  className,
  children,
  ...props
}: MiniCalendarDaysProps) {
  const { startDate, days: dayCount } = useMiniCalendar()
  const days = getDays(startDate, dayCount)

  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {days.map((date) => children(date))}
    </div>
  )
}

export type MiniCalendarDayProps = ComponentProps<typeof Button> & {
  date: Date
}

export function MiniCalendarDay({
  date,
  className,
  ...props
}: MiniCalendarDayProps) {
  const { selectedDate, onDateSelect } = useMiniCalendar()
  const { month, day } = formatDate(date)
  const isSelected = selectedDate && isSameDay(date, selectedDate)
  const isTodayDate = isToday(date)

  return (
    <Button
      className={cn(
        "h-auto min-w-[3rem] flex-col gap-0 p-2 text-xs",
        isTodayDate && !isSelected && "bg-accent",
        className
      )}
      onClick={() => onDateSelect(date)}
      size="sm"
      type="button"
      variant={isSelected ? "default" : "ghost"}
      {...props}
    >
      <span
        className={cn(
          "text-muted-foreground text-[10px] font-medium",
          isSelected && "text-primary-foreground/70"
        )}
      >
        {month}
      </span>
      <span className="text-sm font-semibold">{day}</span>
    </Button>
  )
}
