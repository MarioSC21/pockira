"use client"

import { useToggleButton, useToggleButtonState } from "@platejs/toggle/react"
import { ChevronRightIcon } from "lucide-react"
import type { PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"

import { cn } from "@/shared/lib/utils"

/** A section title whose indented blocks below fold away with the arrow. */
export function ToggleElement(props: PlateElementProps) {
  const state = useToggleButtonState(props.element.id as string)
  const { buttonProps, open } = useToggleButton(state)

  return (
    <PlateElement {...props} className="relative py-1 pl-6 font-medium">
      <button
        aria-expanded={open}
        aria-label={open ? "Contraer sección" : "Expandir sección"}
        className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-1 left-0 flex size-5 cursor-pointer items-center justify-center rounded-sm select-none"
        contentEditable={false}
        type="button"
        {...buttonProps}
      >
        <ChevronRightIcon
          className={cn(
            "size-4 transition-transform duration-75",
            open && "rotate-90"
          )}
        />
      </button>
      {props.children}
    </PlateElement>
  )
}
