import { createAdminClient } from "npm:@insforge/sdk"

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")
const DISPATCH_SECRET = Deno.env.get("REMINDERS_DISPATCH_SECRET")

interface DueReminder {
  reminder_id: string
  note_id: string
  user_id: string
  email: string
  note_title: string
  remind_at: string
  repeat_interval: string
}

export default async function handleDispatch(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization")

  if (!DISPATCH_SECRET || authHeader !== `Bearer ${DISPATCH_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    apiKey: Deno.env.get("API_KEY"),
  })

  const { data: dueReminders, error } = await admin.database.rpc(
    "dispatch_due_reminders",
    {}
  )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.all(
    ((dueReminders ?? []) as DueReminder[]).map(async (reminder) => {
      const emailResult = await sendReminderEmail(reminder)
      return { reminderId: reminder.reminder_id, sent: emailResult.ok }
    })
  )

  return Response.json({ processed: results.length, results })
}

async function sendReminderEmail(reminder: DueReminder) {
  if (!BREVO_API_KEY) {
    return { ok: false, error: "BREVO_API_KEY not configured" }
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: "notificaciones@pockira.app", name: "Pockira" },
      to: [{ email: reminder.email }],
      subject: `Recordatorio: ${reminder.note_title}`,
      htmlContent: `<p>Tu recordatorio para "<strong>${reminder.note_title}</strong>" vence ahora.</p>`,
    }),
  })

  if (!response.ok) {
    return { ok: false, error: await response.text() }
  }

  return { ok: true }
}
