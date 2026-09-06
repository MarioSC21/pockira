import type { Descendant, Value } from "platejs"

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
