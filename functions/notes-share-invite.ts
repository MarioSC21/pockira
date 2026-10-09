import { createClient } from "npm:@insforge/sdk"

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")
const APP_URL = Deno.env.get("APP_URL")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface NoteAccess {
  id: string
  note_id: string
  invited_email: string
  role: string
  status: string
  notes: { title: string } | null
}

export default async function handleShareInvite(
  req: Request
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "")

  if (!accessToken) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const noteAccessId = await readNoteAccessId(req)

  if (!noteAccessId) {
    return jsonResponse({ error: "noteAccessId is required" }, 400)
  }

  const client = createClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    accessToken,
  })

  const { data: userData, error: userError } =
    await client.auth.getCurrentUser()

  if (userError || !userData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const noteAccess = await loadPendingNoteAccess(client, noteAccessId)

  if (!noteAccess) {
    return jsonResponse({ error: "Pending invite not found" }, 404)
  }

  if (!BREVO_API_KEY) {
    return jsonResponse({ error: "BREVO_API_KEY not configured" }, 500)
  }

  const inviterName = userData.user.name ?? userData.user.email
  const emailResult = await sendInviteEmail(noteAccess, inviterName)

  if (!emailResult.ok) {
    return jsonResponse({ error: `Brevo error: ${emailResult.error}` }, 502)
  }

  return jsonResponse({ success: true }, 200)
}

async function readNoteAccessId(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { noteAccessId?: string }
    return body.noteAccessId ?? null
  } catch {
    return null
  }
}

async function loadPendingNoteAccess(
  client: ReturnType<typeof createClient>,
  noteAccessId: string
): Promise<NoteAccess | null> {
  const { data: access, error } = await client.database
    .from("note_accesses")
    .select("id, note_id, invited_email, role, status, notes(title)")
    .eq("id", noteAccessId)
    .single()

  if (error || !access) {
    return null
  }

  const noteAccess = access as unknown as NoteAccess

  return noteAccess.status === "pending" ? noteAccess : null
}

async function sendInviteEmail(noteAccess: NoteAccess, inviterName: string) {
  const noteTitle = noteAccess.notes?.title ?? "una nota"
  const roleLabel = noteAccess.role === "editor" ? "editar" : "ver"
  // The share waits for an answer: it is accepted from the bell
  // (Notificaciones) in the app, not by opening the note.
  const link = APP_URL ? `${APP_URL}/notes` : null

  const html = `
    <p>${inviterName} te invitó a ${roleLabel} la nota "<strong>${noteTitle}</strong>" en Pockira.</p>
    <p>Para aceptarla, inicia sesión con este correo y abre <strong>Notificaciones</strong> (el ícono de la campana).</p>
    ${link ? `<p><a href="${link}">Abrir Pockira</a></p>` : ""}
  `

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: "notificaciones@pockira.app", name: "Pockira" },
      to: [{ email: noteAccess.invited_email }],
      subject: `${inviterName} compartió una nota contigo en Pockira`,
      htmlContent: html,
    }),
  })

  if (!response.ok) {
    return { ok: false, error: await response.text() }
  }

  return { ok: true }
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders })
}
