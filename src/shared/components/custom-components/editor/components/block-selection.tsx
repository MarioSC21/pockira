"use client"

// Trimmed from Plate's block-selection component: table-node only imports
// `blockSelectionVariants`. The `BlockSelection` component it also exports
// needs the block-selection plugin wired into the editor kit, which this
// editor does not do, so it is left out rather than shipped dead.
import { cva } from "class-variance-authority"

export const blockSelectionVariants = cva(
  "bg-brand/[.13] pointer-events-none absolute inset-0 z-1 transition-opacity",
  {
    defaultVariants: {
      active: true,
    },
    variants: {
      active: {
        false: "opacity-0",
        true: "opacity-100",
      },
    },
  }
)
