import { isTauri } from "@tauri-apps/api/core"
import {
  cancel,
  isPermissionGranted,
  pending,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification"
import type { Schedule } from "@tauri-apps/plugin-notification"

/**
 * System notifications on every target: the Tauri plugin on desktop and
 * mobile, the browser Notification API on the web. Only mobile can hand a
 * notification to the OS for later; desktop and web show it immediately, so
 * callers time those themselves.
 */

/** Asks for permission when needed. Call it from a user action (a click) so
    the system prompt has a clear reason. */
export async function ensureNotificationPermission() {
  if (isTauri()) {
    if (await isPermissionGranted()) {
      return true
    }
    return (await requestPermission()) === "granted"
  }

  if (!("Notification" in window)) {
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  return (await Notification.requestPermission()) === "granted"
}

/** Shows a notification right now, if permission was granted. */
export async function showSystemNotification(title: string, body: string) {
  if (isTauri()) {
    if (await isPermissionGranted()) {
      sendNotification({ body, title })
    }
    return
  }

  if ("Notification" in window && Notification.permission === "granted") {
    // oxlint-disable-next-line no-new -- the Notification constructor shows it
    new Notification(title, { body })
  }
}

/** Mobile only: lets the OS deliver the notification later, even with the
    app closed. `id` must be a 32-bit integer, unique per notification. */
export async function scheduleSystemNotification(options: {
  id: number
  title: string
  body: string
  schedule: Schedule
}) {
  if (await isPermissionGranted()) {
    sendNotification(options)
  }
}

/** Mobile only: cancels pending scheduled notifications that match. */
export async function cancelScheduledNotifications(
  matches: (notification: { id: number; title?: string }) => boolean
) {
  const scheduled = await pending()
  const ids = scheduled
    .filter((notification) => matches(notification))
    .map((notification) => notification.id)

  if (ids.length > 0) {
    await cancel(ids)
  }
}
