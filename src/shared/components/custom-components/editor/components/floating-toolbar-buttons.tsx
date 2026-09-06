"use client"

import {
  BoldIcon,
  HighlighterIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react"
import { KEYS } from "platejs"
import { useEditorReadOnly } from "platejs/react"

import { LinkToolbarButton } from "./link-toolbar-button"
import { MarkToolbarButton } from "./mark-toolbar-button"
import { ToolbarGroup } from "./toolbar"

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly()

  if (readOnly) {
    return null
  }

  return (
    <ToolbarGroup>
      <MarkToolbarButton nodeType={KEYS.bold} tooltip="Negrita (⌘+B)">
        <BoldIcon />
      </MarkToolbarButton>

      <MarkToolbarButton nodeType={KEYS.italic} tooltip="Cursiva (⌘+I)">
        <ItalicIcon />
      </MarkToolbarButton>

      <MarkToolbarButton nodeType={KEYS.underline} tooltip="Subrayado (⌘+U)">
        <UnderlineIcon />
      </MarkToolbarButton>

      <MarkToolbarButton
        nodeType={KEYS.strikethrough}
        tooltip="Tachado (⌘+⇧+M)"
      >
        <StrikethroughIcon />
      </MarkToolbarButton>

      <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Resaltar">
        <HighlighterIcon />
      </MarkToolbarButton>

      <LinkToolbarButton />
    </ToolbarGroup>
  )
}
