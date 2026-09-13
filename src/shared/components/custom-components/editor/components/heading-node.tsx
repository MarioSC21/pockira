"use client"

import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import type { PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"

const headingVariants = cva(
  "relative mb-2 data-[nav-target=true]:rounded-md data-[nav-target=true]:bg-(--color-highlight)",
  {
    variants: {
      variant: {
        // Upstream sizes the gap in `em` (1.6/1.4/1/0.75), so it grew with the
        // font: on our text-sm body a 36px h1 ended up with a 57.6px top
        // margin — 2.7 blank body lines. Every level now uses the same fixed
        // mt-4, and mb-2 on the base class, so the gap reads identically at any
        // level. Paragraphs add py-1, making the real gaps 20px above / 12px
        // below: the heading still binds to the content it introduces, without
        // the 3.5x gulf above that read as an empty, writable line.
        h1: "font-heading mt-4 text-4xl font-bold",
        h2: "font-heading mt-4 text-2xl font-semibold tracking-tight",
        h3: "font-heading mt-4 text-xl font-semibold tracking-tight",
        h4: "font-heading mt-4 text-lg font-semibold tracking-tight",
        h5: "mt-4 text-lg font-semibold tracking-tight",
        h6: "mt-4 text-base font-semibold tracking-tight",
      },
    },
  }
)

export function HeadingElement({
  variant = "h1",
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
  return (
    <PlateElement
      as={variant!}
      className={headingVariants({ variant })}
      {...props}
    >
      {props.children}
    </PlateElement>
  )
}

export function H1Element(props: PlateElementProps) {
  return <HeadingElement variant="h1" {...props} />
}

export function H2Element(props: PlateElementProps) {
  return <HeadingElement variant="h2" {...props} />
}

export function H3Element(props: PlateElementProps) {
  return <HeadingElement variant="h3" {...props} />
}

export function H4Element(props: PlateElementProps) {
  return <HeadingElement variant="h4" {...props} />
}

export function H5Element(props: PlateElementProps) {
  return <HeadingElement variant="h5" {...props} />
}

export function H6Element(props: PlateElementProps) {
  return <HeadingElement variant="h6" {...props} />
}
