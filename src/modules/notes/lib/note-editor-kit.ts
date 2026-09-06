import { AutoformatKit } from "@/shared/components/custom-components/editor/plugins/autoformat-kit"
import { BasicNodesKit } from "@/shared/components/custom-components/editor/plugins/basic-nodes-kit"
import { BlockPlaceholderKit } from "@/shared/components/custom-components/editor/plugins/block-placeholder-kit"
import { ExitBreakKit } from "@/shared/components/custom-components/editor/plugins/exit-break-kit"
import { FloatingToolbarKit } from "@/shared/components/custom-components/editor/plugins/floating-toolbar-kit"
import { LinkKit } from "@/shared/components/custom-components/editor/plugins/link-kit"
import { ListKit } from "@/shared/components/custom-components/editor/plugins/list-kit"
import { SlashKit } from "@/shared/components/custom-components/editor/plugins/slash-kit"

export const noteEditorKit = [
  ...BasicNodesKit,
  ...ListKit,
  ...LinkKit,
  ...SlashKit,
  ...BlockPlaceholderKit,
  ...AutoformatKit,
  ...ExitBreakKit,
  ...FloatingToolbarKit,
]
