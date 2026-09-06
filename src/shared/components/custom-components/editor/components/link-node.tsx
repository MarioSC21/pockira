"use client"

import { getLinkAttributes } from "@platejs/link"
import type { TLinkElement } from "platejs"
import type { PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"

import { cn } from "@/shared/lib/utils"

export function LinkElement(props: PlateElementProps<TLinkElement>) {
  return (
    <PlateElement
      {...props}
      as="a"
      className={cn(
        "text-primary decoration-primary font-medium underline underline-offset-4"
      )}
      attributes={{
        ...props.attributes,
        ...getLinkAttributes(props.editor, props.element),
        onMouseOver: (e) => {
          e.stopPropagation()
        },
      }}
    >
      {props.children}
    </PlateElement>
  )
}
