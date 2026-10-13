"use client"

import {
  BulletedListRules,
  isOrderedList,
  OrderedListRules,
  TaskListRules,
} from "@platejs/list"
import { ListPlugin } from "@platejs/list/react"
import { ElementApi, KEYS } from "platejs"
import type { Descendant, TElement } from "platejs"
import { createPlatePlugin } from "platejs/react"

import { BlockList } from "@/shared/components/custom-components/editor/components/block-list"
import { IndentKit } from "@/shared/components/custom-components/editor/plugins/indent-kit"

/** The pasted paragraph as one more item of the list `item` belongs to. */
const toListItem = (
  node: Descendant,
  item: TElement,
  paragraphType: string
) => {
  if (
    !ElementApi.isElement(node) ||
    node.type !== paragraphType ||
    node[KEYS.listType]
  ) {
    return node
  }

  return {
    ...node,
    [KEYS.indent]: item[KEYS.indent],
    [KEYS.listType]: item[KEYS.listType],
    ...(item[KEYS.listType] === KEYS.listTodo && { checked: false }),
  }
}

// Pasting into an empty block replaces it with the pasted blocks, so text
// copied from the editor or from a page (plain paragraphs) dropped into an
// empty list item took its number, bullet or checkbox away. The pasted
// paragraphs become items of that list instead.
const ListPastePlugin = createPlatePlugin({ key: "listPaste" }).overrideEditor(
  ({ editor, tf: { insertFragment } }) => ({
    transforms: {
      insertFragment(fragment, options) {
        const item = options?.at ? undefined : editor.api.block()?.[0]

        if (!item?.[KEYS.listType] || !editor.api.isEmpty(item)) {
          insertFragment(fragment, options)
          return
        }

        const paragraphType = editor.getType(KEYS.p)

        insertFragment(
          fragment.map((node) => toListItem(node, item, paragraphType)),
          options
        )
      },
    },
  })
)

export const ListKit = [
  ...IndentKit,
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
      OrderedListRules.markdown({ variant: ")" }),
      TaskListRules.markdown({ checked: false }),
      TaskListRules.markdown({ checked: true }),
    ],
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const { element } = nodeProps

          return !!element?.listStyleType && !isOrderedList(element)
        },
        transformProps: ({ props }) => ({
          ...props,
          role: "listitem",
          style: {
            ...props.style,
            display: "list-item",
            listStyleType: "none",
          },
        }),
      },
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img,
      ],
    },
    render: {
      belowNodes: BlockList,
    },
  }),
  ListPastePlugin,
]
