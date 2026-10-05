import { useEffect, useState } from "react"

import {
  nextOccurrence,
  scheduleOnDevice,
  showReminderNotification,
} from "@/modules/notes/lib/reminder-notifications"
import { useUpcomingReminders } from "@/modules/notes/service/queries"
import { isMobileApp } from "@/shared/lib/platform"

// setTimeout overflows past ~24.8 days; farther reminders are picked up by a
// later refetch of the list.
const MAX_TIMER_MS = 2_147_483_647

/**
 * Rings the signed-in person's reminders as system notifications.
 * - Mobile: scheduled with the OS, so they ring with the app closed.
 * - Desktop and web: timers in the app, so they ring while it is open
 *   (the email from the backend covers the rest).
 */
export function useReminderNotifications() {
  const { data: reminders } = useUpcomingReminders()
  // The moment the timers are computed from; moved forward after each
  // notification so a repeating reminder schedules its next occurrence.
  const [scheduledFrom, setScheduledFrom] = useState(Date.now)

  useEffect(() => {
    if (!reminders) {
      return
    }

    if (isMobileApp()) {
      void scheduleOnDevice(reminders)
      return
    }

    const now = Math.max(scheduledFrom, Date.now())
    const timers: ReturnType<typeof setTimeout>[] = []

    for (const reminder of reminders) {
      const at = nextOccurrence(reminder, new Date(now))
      const delay = at ? at.getTime() - now : -1

      if (delay >= 0 && delay <= MAX_TIMER_MS) {
        timers.push(
          setTimeout(() => {
            void showReminderNotification(reminder)
            setScheduledFrom(Date.now())
          }, delay)
        )
      }
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }, [reminders, scheduledFrom])
}
