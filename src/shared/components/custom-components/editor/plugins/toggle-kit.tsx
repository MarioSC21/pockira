"use client"

import { TogglePlugin } from "@platejs/toggle/react"

import { ToggleElement } from "@/shared/components/custom-components/editor/components/toggle-node"
import { IndentKit } from "@/shared/components/custom-components/editor/plugins/indent-kit"

// The blocks indented below a toggle are its content, so it needs the indent.
export const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
]
