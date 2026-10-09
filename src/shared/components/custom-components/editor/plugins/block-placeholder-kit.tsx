"use client"

import { KEYS } from "platejs"
import { BlockPlaceholderPlugin } from "platejs/react"

export const BlockPlaceholderKit = [
  BlockPlaceholderPlugin.configure({
    options: {
      // Slate provides its own hint when the entire editor is empty.
      className:
        "before:absolute before:cursor-text before:text-muted-foreground/80 before:content-[attr(placeholder)] has-[[data-slate-placeholder]]:before:hidden",
      placeholders: {
        [KEYS.p]: "Escribe algo...",
      },
      query: ({ path }) => path.length === 1,
    },
  }),
]
