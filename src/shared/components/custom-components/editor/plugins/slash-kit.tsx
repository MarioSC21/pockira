"use client"

import { SlashInputPlugin, SlashPlugin } from "@platejs/slash-command/react"
import { KEYS } from "platejs"
import type { SlateEditor } from "platejs"

import { SlashInputElement } from "@/shared/components/custom-components/editor/components/slash-node"

export const SlashKit = [
  SlashPlugin.configure({
    options: {
      triggerQuery: (editor: SlateEditor) =>
        !editor.api.some({
          match: { type: editor.getType(KEYS.codeBlock) },
        }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
]
