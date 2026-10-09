import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { BellIcon } from "lucide-react"

import { useRespondNoteInvitation } from "@/modules/notes/service/mutations"
import { useNoteInvitations } from "@/modules/notes/service/queries"
import type { NoteInvitation } from "@/modules/notes/types/note"
import { Button } from "@/shared/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"

const ROLE_LABEL: Record<NoteInvitation["role"], string> = {
  editor: "editar",
  reader: "ver",
}

/** Sidebar bell listing the notes shared with this account that wait for an
    answer; a share only shows up in the notes once it is accepted. */
export function NoteInvitationsMenu() {
  const invitations = useNoteInvitations()
  const respond = useRespondNoteInvitation()
  const pending = invitations.data ?? []

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              aria-label={
                pending.length > 0
                  ? `Notificaciones (${pending.length} sin responder)`
                  : "Notificaciones"
              }
              render={
                <Button className="relative" size="icon-lg" variant="ghost" />
              }
            />
          }
        >
          <BellIcon />
          {pending.length > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium">
              {pending.length}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">Notificaciones</TooltipContent>
      </Tooltip>
      {/* Opens beside the icon rail, like the theme and account menus. */}
      <PopoverContent align="end" className="w-80 gap-3" side="right">
        <p className="font-medium">Notificaciones</p>
        {invitations.isPending && (
          <p className="text-muted-foreground">Cargando…</p>
        )}
        {invitations.error && (
          <p className="text-destructive">{invitations.error.message}</p>
        )}
        {invitations.isSuccess && pending.length === 0 && (
          <p className="text-muted-foreground">
            No tienes invitaciones nuevas.
          </p>
        )}
        {respond.error && (
          <p className="text-destructive" role="alert">
            {respond.error.message}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {pending.map((invitation) => {
            const isResponding =
              respond.isPending && respond.variables?.accessId === invitation.id

            return (
              <li className="flex flex-col gap-2" key={invitation.id}>
                <p>
                  <span className="font-medium">
                    {invitation.inviter_name ?? invitation.inviter_email}
                  </span>{" "}
                  te invitó a {ROLE_LABEL[invitation.role]} la nota{" "}
                  <span className="font-medium">
                    “{invitation.note_title || "Nueva nota"}”
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(invitation.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={isResponding}
                    onClick={() =>
                      respond.mutate({ accept: true, accessId: invitation.id })
                    }
                    size="sm"
                  >
                    Aceptar
                  </Button>
                  <Button
                    disabled={isResponding}
                    onClick={() =>
                      respond.mutate({
                        accept: false,
                        accessId: invitation.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
