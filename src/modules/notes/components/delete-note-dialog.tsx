import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

interface DeleteNoteDialogProps {
  /** A note shared with this account is only removed from its notes. */
  isOwner?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteNoteDialog({
  isOwner = true,
  open,
  onOpenChange,
  onConfirm,
}: DeleteNoteDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isOwner ? "Eliminar nota" : "Quitar de mis notas"}
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Esta acción no se puede deshacer. La nota se eliminará permanentemente."
              : "Dejarás de ver esta nota compartida. La nota original no se elimina y su dueño la conserva."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            variant="destructive"
          >
            {isOwner ? "Eliminar" : "Quitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
