import type { Descendant, Value } from "platejs"

import type { TiptapDoc } from "@/modules/notes/types/note"

function extractNodeText(node: Descendant): string {
  if ("text" in node) {
    return typeof node.text === "string" ? node.text : ""
  }
  return (node.children ?? []).map(extractNodeText).join(" ")
}

export function extractText(value: Value | undefined): string {
  if (!value) {
    return ""
  }
  return value.map(extractNodeText).join(" ").trim()
}

export function emptyNoteBody(): Value {
  return [{ children: [{ text: "" }], type: "p" }]
}

function isEditorNode(node: unknown): node is Value[number] {
  return (
    typeof node === "object" &&
    node !== null &&
    Array.isArray((node as { children?: unknown }).children)
  )
}

/**
 * The backend stores a `{ type: "doc", content }` envelope (its check
 * constraint requires it). The editor's blocks travel inside `content`.
 * Rows created by the database default hold Tiptap nodes instead, which the
 * editor cannot read, so those open as an empty note.
 */
export function toEditorValue(doc: TiptapDoc | null | undefined): Value {
  const nodes = doc?.content ?? []

  return nodes.length > 0 && nodes.every(isEditorNode) ? nodes : emptyNoteBody()
}

export function toNoteContent(value: Value): TiptapDoc {
  return { content: value, type: "doc" }
}
