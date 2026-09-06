import { LinkIcon, MailIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
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

interface Collaborator {
  id: string
  name: string
  initials: string
  access: string
}

const collaborators: Collaborator[] = [
  { access: "Puede ver", id: "saki", initials: "SK", name: "Saki" },
  { access: "Puede editar", id: "juan", initials: "JD", name: "Juan" },
]

interface ShareNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string
}

export function ShareNoteDialog({
  open,
  onOpenChange,
  shareUrl,
}: ShareNoteDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir nota</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Puede editar</span>
            <Switch />
          </div>
          <InputGroup>
            <InputGroupAddon>
              <MailIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Invitar por email..." />
          </InputGroup>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Compartido con</p>
            <ul className="flex flex-col gap-3">
              {collaborators.map((collaborator) => (
                <li className="flex items-center gap-2" key={collaborator.id}>
                  <Avatar size="sm">
                    <AvatarFallback>{collaborator.initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm">{collaborator.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {collaborator.access}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <InputGroup>
            <InputGroupAddon>
              <LinkIcon />
            </InputGroupAddon>
            <InputGroupInput readOnly value={shareUrl} />
          </InputGroup>
        </div>
      </DialogContent>
    </Dialog>
  )
}
