import { useState } from "react"

import { useImportDeviceNotes } from "@/modules/notes/service/mutations"
import { useDeviceNotes } from "@/modules/notes/service/queries"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

// "Ahora no" lasts until the app is closed; the offer comes back next launch.
const DISMISSED_KEY = "pockira:device-notes-import-dismissed"

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1")
  } catch {
    // Without storage the offer just shows again on the next visit.
  }
}

/**
 * Shown to a signed-in person whose device still holds notes written as a
 * guest, offering to upload them to the account.
 */
export function ImportDeviceNotesDialog() {
  const { data: deviceNotes = [] } = useDeviceNotes()
  const importNotes = useImportDeviceNotes()
  const [isDismissed, setIsDismissed] = useState(readDismissed)

  const count = deviceNotes.length
  const isOpen = count > 0 && !isDismissed && !importNotes.isSuccess

  const handleDismiss = () => {
    writeDismissed()
    setIsDismissed(true)
  }

  const handleImport = async () => {
    await importNotes.mutateAsync(deviceNotes).catch(() => null)
  }

  const label = count === 1 ? "1 nota" : `${count} notas`

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || importNotes.isPending)) {
          handleDismiss()
        }
      }}
      open={isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tienes {label} en este dispositivo</DialogTitle>
          <DialogDescription>
            Las escribiste sin iniciar sesión. ¿Quieres subirlas a tu cuenta
            para tenerlas sincronizadas? Al subirlas se quitan del modo invitado
            para que no queden duplicadas.
          </DialogDescription>
        </DialogHeader>
        {importNotes.error ? (
          <p className="text-destructive text-sm" role="alert">
            No se pudieron subir: {importNotes.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={importNotes.isPending}
            onClick={handleDismiss}
            variant="ghost"
          >
            Ahora no
          </Button>
          <Button disabled={importNotes.isPending} onClick={handleImport}>
            {importNotes.isPending ? "Subiendo…" : `Subir ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
