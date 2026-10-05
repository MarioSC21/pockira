import { MailIcon } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"

import { useShareNote } from "@/modules/notes/service/mutations"
import { useNoteCollaborators } from "@/modules/notes/service/queries"
import type { NoteAccess } from "@/modules/notes/types/note"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import { Switch } from "@/shared/components/ui/switch"

const ROLE_LABEL: Record<NoteAccess["role"], string> = {
  editor: "Puede editar",
  reader: "Puede ver",
}

const STATUS_LABEL: Partial<Record<NoteAccess["status"], string>> = {
  pending: "Pendiente",
}

interface ShareNoteDialogProps {
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareNoteDialog({
  noteId,
  open,
  onOpenChange,
}: ShareNoteDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir nota</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open so the collaborators are fetched on demand
            and the form starts empty every time. */}
        {open && <ShareNoteForm noteId={noteId} />}
      </DialogContent>
    </Dialog>
  )
}

function ShareNoteForm({ noteId }: { noteId: string }) {
  const [email, setEmail] = useState("")
  const [canEdit, setCanEdit] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const collaborators = useNoteCollaborators(noteId)
  const share = useShareNote()

  const activeCollaborators = (collaborators.data ?? []).filter(
    (access) => access.status !== "revoked"
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)

    const result = await share
      .mutateAsync({
        email: email.trim().toLowerCase(),
        noteId,
        role: canEdit ? "editor" : "reader",
      })
      .catch(() => null)

    if (!result) {
      return
    }

    setEmail("")
    setNotice(
      result.emailSent
        ? "Invitación enviada."
        : "Acceso concedido, pero no se pudo enviar el email de invitación."
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Puede editar</span>
          <Switch checked={canEdit} onCheckedChange={setCanEdit} />
        </div>
        <InputGroup>
          <InputGroupAddon>
            <MailIcon />
          </InputGroupAddon>
          <InputGroupInput
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Invitar por email..."
            required
            type="email"
            value={email}
          />
        </InputGroup>
        {share.error ? (
          <p className="text-destructive text-sm" role="alert">
            {share.error.message}
          </p>
        ) : null}
        {notice ? (
          <p className="text-muted-foreground text-sm">{notice}</p>
        ) : null}
        <Button className="w-full" disabled={share.isPending} type="submit">
          {share.isPending ? "Invitando…" : "Invitar"}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Compartido con</p>
        {collaborators.isPending && (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        )}
        {collaborators.error && (
          <p className="text-destructive text-sm">
            {collaborators.error.message}
          </p>
        )}
        {collaborators.isSuccess && activeCollaborators.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Todavía no compartiste esta nota.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {activeCollaborators.map((access) => (
            <li className="flex items-center gap-2" key={access.id}>
              <Avatar size="sm">
                <AvatarFallback>
                  {access.invited_email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">
                {access.invited_email}
              </span>
              <span className="text-muted-foreground text-xs">
                {[STATUS_LABEL[access.status], ROLE_LABEL[access.role]]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
