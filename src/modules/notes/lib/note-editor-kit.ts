import { AutoformatKit } from "@/shared/components/custom-components/editor/plugins/autoformat-kit"
import { BasicNodesKit } from "@/shared/components/custom-components/editor/plugins/basic-nodes-kit"
import { BlockPlaceholderKit } from "@/shared/components/custom-components/editor/plugins/block-placeholder-kit"
import { CodeBlockKit } from "@/shared/components/custom-components/editor/plugins/code-block-kit"
import { ExitBreakKit } from "@/shared/components/custom-components/editor/plugins/exit-break-kit"
import { FloatingToolbarKit } from "@/shared/components/custom-components/editor/plugins/floating-toolbar-kit"
import { FontKit } from "@/shared/components/custom-components/editor/plugins/font-kit"
import { LinkKit } from "@/shared/components/custom-components/editor/plugins/link-kit"
import { ListKit } from "@/shared/components/custom-components/editor/plugins/list-kit"
import { SlashKit } from "@/shared/components/custom-components/editor/plugins/slash-kit"
import { TableKit } from "@/shared/components/custom-components/editor/plugins/table-kit"

export const noteEditorKit = [
  ...BasicNodesKit,
  ...CodeBlockKit,
  ...FontKit,
  ...ListKit,
  ...LinkKit,
  ...TableKit,
  ...SlashKit,
  ...BlockPlaceholderKit,
  ...AutoformatKit,
  ...ExitBreakKit,
  ...FloatingToolbarKit,
]
