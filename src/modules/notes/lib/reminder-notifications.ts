import { Schedule } from "@tauri-apps/plugin-notification"
import { addDays, addMonths, addWeeks } from "date-fns"

import type {
  ReminderRepeatInterval,
  UpcomingReminder,
} from "@/modules/notes/types/note"
import {
  cancelScheduledNotifications,
  scheduleSystemNotification,
  showSystemNotification,
} from "@/shared/service/system-notifications"

// Also identifies this feature's scheduled notifications on mobile, so
// rescheduling reminders leaves other notifications (pomodoro) alone.
const REMINDER_TITLE = "Recordatorio"

export function reminderTitle(reminder: UpcomingReminder) {
  return reminder.note_title.trim() || "Nota sin título"
}

/** Shows a notification right now (desktop app and web). */
export function showReminderNotification(reminder: UpcomingReminder) {
  return showSystemNotification(REMINDER_TITLE, reminderTitle(reminder))
}

const ADVANCE: Record<
  Exclude<ReminderRepeatInterval, "none">,
  (date: Date, amount: number) => Date
> = {
  daily: addDays,
  monthly: addMonths,
  weekly: addWeeks,
}

/**
 * The next time a reminder should ring, or null when a one-off reminder is
 * already in the past. Repeating reminders whose stored date has passed (the
 * backend advances it only when its dispatcher runs) are rolled forward.
 */
export function nextOccurrence(
  reminder: Pick<UpcomingReminder, "remind_at" | "repeat_interval">,
  now = new Date()
): Date | null {
  const start = new Date(reminder.remind_at)

  if (start > now) {
    return start
  }

  if (reminder.repeat_interval === "none") {
    return null
  }

  const advance = ADVANCE[reminder.repeat_interval]
  let steps = 1
  let next = advance(start, steps)

  while (next <= now) {
    steps += 1
    next = advance(start, steps)
  }

  return next
}

/** Android/iOS notification ids are 32-bit integers; derive a stable one
    from the reminder's UUID. */
function notificationId(reminderId: string) {
  let hash = 0

  for (const char of reminderId) {
    hash = Math.imul(31, hash) + (char.codePointAt(0) ?? 0)
  }

  return Math.abs(hash) % 2_147_483_647
}

function toSchedule(reminder: UpcomingReminder, at: Date) {
  const time = { hour: at.getHours(), minute: at.getMinutes() }

  switch (reminder.repeat_interval) {
    case "daily": {
      return Schedule.interval(time, true)
    }
    case "weekly": {
      // The plugin counts weekdays from 1 = Sunday.
      return Schedule.interval({ ...time, weekday: at.getDay() + 1 }, true)
    }
    case "monthly": {
      return Schedule.interval({ ...time, day: at.getDate() }, true)
    }
    default: {
      return Schedule.at(at, false, true)
    }
  }
}

/**
 * Mobile: hands every reminder to the operating system, which rings it even
 * with the app closed. Previously scheduled ones are replaced so edits and
 * deletions on other devices are reflected.
 */
export async function scheduleOnDevice(reminders: UpcomingReminder[]) {
  await cancelScheduledNotifications(
    (notification) => notification.title === REMINDER_TITLE
  )

  await Promise.all(
    reminders.map((reminder) => {
      const at = nextOccurrence(reminder)

      return at
        ? scheduleSystemNotification({
            body: reminderTitle(reminder),
            id: notificationId(reminder.id),
            schedule: toSchedule(reminder, at),
            title: REMINDER_TITLE,
          })
        : null
    })
  )
}
