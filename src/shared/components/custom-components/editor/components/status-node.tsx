"use client"

import { CheckIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import type { TElement } from "platejs"
import type { PlateElementProps } from "platejs/react"
import { PlateElement, useReadOnly } from "platejs/react"
import { useEffect, useState } from "react"
import type { CSSProperties, FormEvent } from "react"

import {
  MAX_STATUS_NAME_LENGTH,
  rememberStatus,
  removeStatus,
  saveStatus,
  STATUS_COLORS,
  statusColorValue,
  useStatuses,
} from "@/shared/components/custom-components/editor/status-store"
import type {
  NoteStatus,
  StatusColorId,
} from "@/shared/components/custom-components/editor/status-store"
import { Input } from "@/shared/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { cn } from "@/shared/lib/utils"

export interface TStatusElement extends TElement {
  name: string
  color: StatusColorId
}

/** The tint and the text of a status come from its one color, mixed so both
    read on light and dark themes. */
export function statusStyle(color: unknown): CSSProperties {
  const value = statusColorValue(color)

  return {
    backgroundColor: `color-mix(in oklab, ${value} 22%, transparent)`,
    color: `color-mix(in oklab, ${value} 62%, var(--foreground))`,
  }
}

const PILL_CLASS =
  "inline-flex items-center rounded-md px-1.5 py-px text-xs leading-5 font-medium whitespace-nowrap"

export function StatusPill({
  className,
  status,
}: {
  className?: string
  status: Pick<NoteStatus, "color" | "name">
}) {
  return (
    <span
      className={cn(PILL_CLASS, className)}
      style={statusStyle(status.color)}
    >
      {status.name}
    </span>
  )
}

function NewStatusForm({
  onCreate,
}: {
  onCreate: (status: NoteStatus) => void
}) {
  const [name, setName] = useState("")
  const [color, setColor] = useState<StatusColorId>("blue")

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (name.trim()) {
      onCreate({ color, name: name.trim() })
    }
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <Input
        aria-label="Nombre del estado"
        autoFocus
        maxLength={MAX_STATUS_NAME_LENGTH}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre del estado"
        value={name}
      />
      <div className="flex flex-wrap gap-1.5">
        {STATUS_COLORS.map((item) => (
          <button
            aria-label={item.label}
            aria-pressed={item.id === color}
            className="ring-offset-popover flex size-6 items-center justify-center rounded-full aria-pressed:ring-2 aria-pressed:ring-offset-2"
            key={item.id}
            onClick={() => setColor(item.id)}
            style={{ backgroundColor: item.value, color: item.value }}
            title={item.label}
            type="button"
          >
            {item.id === color && <CheckIcon className="size-3.5 text-white" />}
          </button>
        ))}
      </div>
      <button
        className="bg-primary text-primary-foreground rounded-xl px-2 py-1.5 text-sm font-medium disabled:opacity-50"
        disabled={!name.trim()}
        type="submit"
      >
        Crear estado
      </button>
    </form>
  )
}

/** A colored tag inside a line. Clicking it changes it for another status,
    creates a new one or takes it off the line. */
export function StatusElement(props: PlateElementProps<TStatusElement>) {
  const { editor, element } = props
  const readOnly = useReadOnly()
  const statuses = useStatuses()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // A status made on another device joins this one's list once seen.
  useEffect(() => {
    rememberStatus({ color: element.color, name: element.name })
  }, [element.color, element.name])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // Reset on opening: while it closes the form stays as it is, so the list
    // does not flash back during the fade.
    if (open) {
      setIsCreating(false)
    }
  }

  const applyStatus = (status: NoteStatus) => {
    editor.tf.setNodes<TStatusElement>(
      { color: status.color, name: status.name },
      { at: editor.api.findPath(element) }
    )
    handleOpenChange(false)
  }

  const handleCreate = (status: NoteStatus) => {
    saveStatus(status)
    applyStatus(status)
  }

  const handleRemove = () => {
    handleOpenChange(false)
    editor.tf.removeNodes({ at: editor.api.findPath(element) })
    editor.tf.focus()
  }

  return (
    <PlateElement
      {...props}
      as="span"
      attributes={{ ...props.attributes, contentEditable: false }}
      className="mx-0.5 inline-block align-baseline"
    >
      {readOnly ? (
        <StatusPill status={element} />
      ) : (
        <Popover onOpenChange={handleOpenChange} open={isOpen}>
          <PopoverTrigger
            className={cn(PILL_CLASS, "cursor-pointer hover:brightness-110")}
            style={statusStyle(element.color)}
          >
            {element.name}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 gap-2 rounded-2xl p-2">
            {isCreating ? (
              <NewStatusForm onCreate={handleCreate} />
            ) : (
              <>
                <ul className="flex max-h-56 flex-col overflow-y-auto">
                  {statuses.map((status) => (
                    <li className="group flex items-center" key={status.name}>
                      <button
                        className="hover:bg-foreground/10 flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left"
                        onClick={() => applyStatus(status)}
                        type="button"
                      >
                        <StatusPill className="truncate" status={status} />
                        {status.name === element.name &&
                          status.color === element.color && (
                            <CheckIcon className="ml-auto size-3.5 shrink-0" />
                          )}
                      </button>
                      <button
                        aria-label={`Borrar el estado ${status.name}`}
                        className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground rounded-lg p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => removeStatus(status.name)}
                        title="Borrar de la lista"
                        type="button"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="bg-foreground/5 h-px" />
                <button
                  className="hover:bg-foreground/10 flex items-center gap-2 rounded-xl px-2 py-1.5 text-left"
                  onClick={() => setIsCreating(true)}
                  type="button"
                >
                  <PlusIcon className="size-4" /> Nuevo estado
                </button>
                <button
                  className="hover:bg-foreground/10 flex items-center gap-2 rounded-xl px-2 py-1.5 text-left"
                  onClick={handleRemove}
                  type="button"
                >
                  <Trash2Icon className="size-4" /> Quitar de la línea
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
      {props.children}
    </PlateElement>
  )
}
